import { Injectable } from '@nestjs/common';

import { v4 } from 'uuid';

import { Cart } from '../models';
import { Pool } from 'pg';

@Injectable()
export class CartService {
  private userCarts: Record<string, Cart> = {};

  private readonly pool: Pool;

  constructor() {
    this.pool = new Pool({
      connectionString: process.env.DB_CONNECTION_STRING,
    });
  }

  async getCarts(): Promise<any[]> {
    const client = await this.pool.connect();
    try {
      const result = await client.query('SELECT * FROM cart_items');
      return result.rows;
    } finally {
      client.release();
    }
  }

  findByUserId(userId: string): Cart {
    return this.userCarts[ userId ];
  }

  createByUserId(userId: string) {
    const id = v4(v4());
    const userCart = {
      id,
      items: [],
    };

    this.userCarts[ userId ] = userCart;

    return userCart;
  }

  findOrCreateByUserId(userId: string): Cart {
    const userCart = this.findByUserId(userId);

    if (userCart) {
      return userCart;
    }

    return this.createByUserId(userId);
  }

  updateByUserId(userId: string, { items }: Cart): Cart {
    const { id, ...rest } = this.findOrCreateByUserId(userId);

    const updatedCart = {
      id,
      ...rest,
      items: [ ...items ],
    }

    this.userCarts[ userId ] = { ...updatedCart };

    return { ...updatedCart };
  }

  async removeByUserId(productId: string): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      await client.query('DELETE FROM cart_items WHERE product_id = $1', [productId]);

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

}
