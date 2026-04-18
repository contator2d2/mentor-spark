import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import PDFDocument = require('pdfkit');
import { Contract, ContractStatus } from '../../entities/contract.entity';
import { ContractTemplate } from '../../entities/contract-template.entity';
import { Lead } from '../../entities/lead.entity';
import { Plan } from '../../entities/plan.entity';
import { User } from '../../entities/user.entity';

function fmtBRL(v?: number | null) {
  if (v == null) return '—';
  return Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}
function fmtDate(d?: Date | string | null) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('pt-BR');
}

/** Substitui {{placeholders}} no corpo do template. */
export function resolveTemplate(body: string, lead: Lead, mentor: User, plan: Plan | null) {
  const map: Record<string, string> = {
    nome: lead.name || '',
    email: lead.email || '',
    telefone: lead.phone || '',
    cpf: lead.cpf || '',
    rg: lead.rg || '',
    data_nascimento: fmtDate(lead.birthDate as any),
    endereco: [lead.addressStreet, lead.addressNumber, lead.addressComplement].filter(Boolean).join(', '),
    bairro: lead.addressNeighborhood || '',
    cidade: lead.addressCity || '',
    estado: lead.addressState || '',
    cep: lead.addressZip || '',
    empresa: lead.companyLegalName || lead.company || '',
    cnpj: lead.companyCnpj || '',
    empresa_endereco: [lead.companyAddressStreet, lead.companyAddressNumber].filter(Boolean).join(', '),
    empresa_cidade: lead.companyAddressCity || '',
    empresa_estado: lead.companyAddressState || '',
    empresa_cep: lead.companyAddressZip || '',
    segmento: lead.segment || '',
    funcionarios: lead.employees != null ? String(lead.employees) : '',
    faturamento: fmtBRL(lead.revenue as any),
    mentor_nome: mentor.name || '',
    mentor_email: mentor.email || '',
    mentor_marca: mentor.brandName || mentor.name || '',
    plano_nome: plan?.name || '',
    valor_plano: fmtBRL(plan?.priceMonthly as any),
    data_hoje: fmtDate(new Date()),
  };
  return body.replace(/\{\{\s*([a-z_]+)\s*\}\}/gi, (_, k) => map[k.toLowerCase()] ?? `{{${k}}}`);
}

@Injectable()
export class ContractsService {
  constructor(
    @InjectRepository(Contract) private contracts: Repository<Contract>,
  ) {}

  async generate(mentor: User, lead: Lead, tpl: ContractTemplate, plan: Plan | null, title?: string) {
    const resolved = resolveTemplate(tpl.body, lead, mentor, plan);
    const c = this.contracts.create({
      mentorId: mentor.id,
      leadId: lead.id,
      templateId: tpl.id,
      title: title || tpl.name,
      bodyResolved: resolved,
      status: ContractStatus.DRAFT,
    });
    return this.contracts.save(c);
  }

  renderPdf(c: Contract, mentor?: User): Promise<Buffer> {
    return new Promise(async (resolve, reject) => {
      const doc = new PDFDocument({ size: 'A4', margins: { top: 60, bottom: 60, left: 60, right: 60 } });
      const chunks: Buffer[] = [];
      doc.on('data', (b) => chunks.push(b as Buffer));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // Cabeçalho com logo da marca, se disponível
      if (mentor?.brandLogoUrl) {
        try {
          const logoBuf = await this.fetchLogo(mentor.brandLogoUrl);
          if (logoBuf) {
            doc.image(logoBuf, { fit: [120, 60], align: 'center' });
            doc.moveDown(0.5);
          }
        } catch {
          // segue sem logo
        }
      }
      if (mentor?.brandName) {
        doc.font('Helvetica-Bold').fontSize(11).fillColor('#444444')
          .text(mentor.brandName, { align: 'center' });
        doc.moveDown(0.5);
      }
      doc.fillColor('#000000');

      doc.font('Helvetica-Bold').fontSize(18).text(c.title, { align: 'center' });
      doc.moveDown(1.5);

      doc.font('Helvetica').fontSize(11).text(c.bodyResolved, {
        align: 'justify',
        lineGap: 3,
      });

      doc.moveDown(3);
      doc.font('Helvetica').fontSize(10).fillColor('#666666');
      doc.text(`Documento gerado em ${new Date().toLocaleString('pt-BR')}`, { align: 'center' });
      if (c.signedAt) {
        doc.moveDown(0.5);
        doc.fillColor('#000000').font('Helvetica-Bold').fontSize(11);
        doc.text(`Assinado eletronicamente por ${c.signedName || ''} em ${new Date(c.signedAt).toLocaleString('pt-BR')}`, {
          align: 'center',
        });
        doc.font('Helvetica').fontSize(9).fillColor('#888888').text(`IP: ${c.signedIp || '—'}`, { align: 'center' });
      }
      doc.end();
    });
  }

  private async fetchLogo(url: string): Promise<Buffer | null> {
    try {
      let absolute = url;
      if (url.startsWith('/uploads/')) {
        const base = process.env.PUBLIC_BACKEND_URL || `http://localhost:${process.env.PORT || 3000}`;
        absolute = `${base.replace(/\/$/, '')}${url}`;
      }
      const r = await fetch(absolute);
      if (!r.ok) return null;
      const ab = await r.arrayBuffer();
      return Buffer.from(ab);
    } catch {
      return null;
    }
  }
}
