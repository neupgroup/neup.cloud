import Mapper from '@neupgroup/mapper';
import mysql from 'mysql2/promise';

const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',
  database: 'test',
});

const orm = Mapper.createOrm({
  async getDocuments(options: any) {
    const [rows] = await pool.execute(`SELECT * FROM ${options.collection}`);
    return rows as any[];
  },
  async addDocument(collection: string, data: any) {
    const keys = Object.keys(data);
    const values = Object.values(data);
    const placeholders = keys.map(() => '?').join(', ');
    const [result] = await pool.execute(
      `INSERT INTO ${collection} (${keys.join(', ')}) VALUES (${placeholders})`,
      values
    );
    return (result as any).insertId;
  },
  async updateDocument(collection: string, docId: string, data: any) {
    const keys = Object.keys(data);
    const setClause = keys.map((key) => `${key} = ?`).join(', ');
    const values = [...Object.values(data), docId];
    await pool.execute(
      `UPDATE ${collection} SET ${setClause} WHERE id = ?`,
      values
    );
  },
  async deleteDocument(collection: string, docId: string) {
    await pool.execute(`DELETE FROM ${collection} WHERE id = ?`, [docId]);
  },
});

export default orm;
