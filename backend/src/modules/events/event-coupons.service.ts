import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventCoupon, CouponDiscountType } from '../../entities/event-coupon.entity';
import { EventCouponRedemption } from '../../entities/event-coupon-redemption.entity';
import { CaptureEvent } from '../../entities/capture-event.entity';
import { EventTicketTier } from '../../entities/event-ticket-tier.entity';

export interface CouponApplicationResult {
  coupon: EventCoupon;
  discountCents: number;
  finalCents: number;
  originalCents: number;
}

@Injectable()
export class EventCouponsService {
  constructor(
    @InjectRepository(EventCoupon) private coupons: Repository<EventCoupon>,
    @InjectRepository(EventCouponRedemption) private redemptions: Repository<EventCouponRedemption>,
    @InjectRepository(CaptureEvent) private events: Repository<CaptureEvent>,
  ) {}

  // ==================== CRUD (mentor) ====================
  async list(eventId: string) {
    return this.coupons.find({ where: { eventId }, order: { createdAt: 'DESC' } });
  }

  async create(mentorId: string, eventId: string, dto: Partial<EventCoupon>) {
    if (!dto.code) throw new BadRequestException('Código é obrigatório');
    const event = await this.events.findOne({ where: { id: eventId } });
    if (!event) throw new NotFoundException('Evento não encontrado');
    const code = dto.code.trim().toUpperCase();
    const existing = await this.coupons.findOne({ where: { eventId, code } });
    if (existing) throw new BadRequestException('Já existe cupom com esse código neste evento');
    if (dto.discountType === CouponDiscountType.PERCENT && (dto.discountValue! < 1 || dto.discountValue! > 100)) {
      throw new BadRequestException('Percentual deve ser entre 1 e 100');
    }
    if (dto.discountType === CouponDiscountType.FIXED && (dto.discountValue! < 1)) {
      throw new BadRequestException('Valor fixo deve ser maior que zero');
    }
    const c = this.coupons.create({ ...dto, code, eventId, mentorId, usedCount: 0 });
    return this.coupons.save(c);
  }

  async update(id: string, dto: Partial<EventCoupon>) {
    const c = await this.coupons.findOne({ where: { id } });
    if (!c) throw new NotFoundException('Cupom não encontrado');
    if (dto.code) dto.code = dto.code.trim().toUpperCase();
    await this.coupons.update(id, dto);
    return this.coupons.findOne({ where: { id } });
  }

  async remove(id: string) {
    await this.coupons.delete(id);
    return { ok: true };
  }

  // ==================== Validação/aplicação ====================
  /**
   * Valida cupom e calcula desconto para um tier específico.
   * Não persiste nada — o resgate é registrado apenas quando o pagamento é confirmado.
   */
  async validateAndApply(
    eventId: string,
    code: string,
    tier: EventTicketTier,
    payer: { email: string; cpfCnpj?: string },
  ): Promise<CouponApplicationResult> {
    if (!code || !code.trim()) throw new BadRequestException('Informe um cupom');
    const coupon = await this.coupons.findOne({
      where: { eventId, code: code.trim().toUpperCase() },
    });
    if (!coupon) throw new BadRequestException('Cupom inválido');
    if (!coupon.isActive) throw new BadRequestException('Cupom inativo');

    const now = new Date();
    if (coupon.startsAt && new Date(coupon.startsAt) > now) {
      throw new BadRequestException('Cupom ainda não é válido');
    }
    if (coupon.endsAt && new Date(coupon.endsAt) < now) {
      throw new BadRequestException('Cupom expirado');
    }
    if (coupon.maxUses != null && coupon.usedCount >= coupon.maxUses) {
      throw new BadRequestException('Cupom esgotado');
    }
    if (
      coupon.applicableTierIds &&
      coupon.applicableTierIds.length > 0 &&
      !coupon.applicableTierIds.includes(tier.id)
    ) {
      throw new BadRequestException('Cupom não é válido para este lote');
    }
    if (coupon.oneUsePerPerson) {
      const already = await this.redemptions.findOne({
        where: { couponId: coupon.id, email: payer.email.toLowerCase() },
      });
      if (already) throw new BadRequestException('Você já utilizou este cupom');
    }

    const original = tier.priceCents;
    let discount = 0;
    if (coupon.discountType === CouponDiscountType.PERCENT) {
      discount = Math.floor((original * coupon.discountValue) / 100);
    } else {
      discount = coupon.discountValue;
    }
    if (discount > original) discount = original;
    const finalCents = original - discount;
    return { coupon, discountCents: discount, finalCents, originalCents: original };
  }

  /** Registra o resgate quando o pagamento é confirmado. */
  async recordRedemption(input: {
    couponId: string;
    registrationId: string;
    paymentId?: string;
    email: string;
    cpfCnpj?: string;
    discountCents: number;
  }) {
    // idempotente (unique index couponId+email)
    const existing = await this.redemptions.findOne({
      where: { couponId: input.couponId, email: input.email.toLowerCase() },
    });
    if (existing) return existing;
    const r = this.redemptions.create({
      couponId: input.couponId,
      registrationId: input.registrationId,
      paymentId: input.paymentId,
      email: input.email.toLowerCase(),
      cpfCnpj: input.cpfCnpj,
      discountCents: input.discountCents,
    });
    await this.redemptions.save(r);
    await this.coupons.increment({ id: input.couponId } as any, 'usedCount', 1);
    return r;
  }
}