import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

export interface SupportTicket {
  id: string;
  subject: string;
  user_id: string;
  user_phone: string;
  status: 'open' | 'in_progress' | 'resolved';
  created_at: Date;
  last_message_at: Date;
  message_count: number;
}

export interface SupportMessage {
  id: string;
  ticket_id: string;
  sender_id: string;
  sender_role: 'user' | 'admin';
  body: string;
  created_at: Date;
}

@Injectable()
export class SupportService {
  constructor(
    @InjectDataSource()
    private readonly db: DataSource,
  ) {}

  async createTicket(userId: string, userPhone: string, subject: string, body: string) {
    const [ticket] = await this.db.query<SupportTicket[]>(
      `INSERT INTO support_tickets (user_id, user_phone, subject, status)
       VALUES ($1, $2, $3, 'open')
       RETURNING *`,
      [userId, userPhone, subject],
    );

    await this.db.query(
      `INSERT INTO support_messages (ticket_id, sender_id, sender_role, body)
       VALUES ($1, $2, 'user', $3)`,
      [ticket.id, userId, body],
    );

    return ticket;
  }

  async getUserTickets(userId: string): Promise<SupportTicket[]> {
    return this.db.query(
      `SELECT t.*, COUNT(m.id)::int AS message_count
       FROM support_tickets t
       LEFT JOIN support_messages m ON m.ticket_id = t.id
       WHERE t.user_id = $1
       GROUP BY t.id
       ORDER BY t.last_message_at DESC`,
      [userId],
    );
  }

  async addMessage(ticketId: string, senderId: string, senderRole: 'user' | 'admin', body: string) {
    const [ticket] = await this.db.query<SupportTicket[]>(
      `SELECT * FROM support_tickets WHERE id = $1`,
      [ticketId],
    );
    if (!ticket) throw new NotFoundException('Ticket not found');

    const [message] = await this.db.query<SupportMessage[]>(
      `INSERT INTO support_messages (ticket_id, sender_id, sender_role, body)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [ticketId, senderId, senderRole, body],
    );

    await this.db.query(
      `UPDATE support_tickets SET last_message_at = NOW(), status = 'in_progress'
       WHERE id = $1 AND status = 'open'`,
      [ticketId],
    );

    return message;
  }

  // Admin
  async getAdminTickets(status?: string): Promise<SupportTicket[]> {
    const where = status ? `WHERE t.status = ANY($1::text[])` : '';
    const params = status ? [status.split(',')] : [];

    return this.db.query(
      `SELECT t.*, COUNT(m.id)::int AS message_count
       FROM support_tickets t
       LEFT JOIN support_messages m ON m.ticket_id = t.id
       ${where}
       GROUP BY t.id
       ORDER BY t.last_message_at DESC
       LIMIT 100`,
      params,
    );
  }

  async resolveTicket(ticketId: string) {
    await this.db.query(
      `UPDATE support_tickets SET status = 'resolved' WHERE id = $1`,
      [ticketId],
    );
    return { success: true };
  }
}
