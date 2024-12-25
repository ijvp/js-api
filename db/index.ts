import pg from "pg";
import { Client, Pool } from "pg";

const client = new Client({
    user: "postgres",
    password: "postgres",
    host: 'my.database-server.com',
    port: 5432,
    database: 'database-name',
  })