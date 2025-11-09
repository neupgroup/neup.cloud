import { Mapper } from '@neupgroup/mapper';
import mysql from 'mysql2/promise';

const pool = mysql.createPool({
  host: process.env.MYSQL_HOST,
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD,
  database: process.env.MYSQL_DATABASE,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

export const db = new Mapper(pool);

export interface Server {
    id: string;
    name: string;
    ip: string;
    os: string;
    status: 'Running' | 'Stopped' | 'Error' | 'Building';
    cpu: string;
    ram: string;
    storage: string;
    region: string;
    provider: 'aws' | 'gcp' | 'azure' | 'do';
}
