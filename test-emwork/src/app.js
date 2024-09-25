// app.js
const express = require('express');
const moment = require('moment');
const { Pool } = require('pg');

const cors = require('cors'); // Import the CORS module


// สร้างการเชื่อมต่อกับฐานข้อมูล PostgreSQL โดยใช้ข้อมูลจาก ElephantSQL
const pool = new Pool({
  connectionString: 'postgres://jofnlpey:NweQLLRaE3LQaS89fEPdU0arxrzY9Jru@john.db.elephantsql.com/jofnlpey',
});

const app = express();
const port = 3000;
app.use(cors());
// เพื่อให้สามารถรับข้อมูลแบบ JSON ได้
app.use(express.json());

// Endpoint สำหรับบันทึกข้อมูล
app.post('/transaction', async (req, res) => {
  const { type, itemName, amount, transactionDate } = req.body;

  // ตรวจสอบว่ามีข้อมูลครบหรือไม่
  if (!type || !itemName || !amount || !transactionDate) {
    return res.status(400).json({ error: 'กรุณากรอกข้อมูลให้ครบถ้วน' });
  }

  const createdAt = moment().format('YYYY-MM-DD HH:mm:ss');
  const updatedAt = createdAt;

  try {
    // บันทึกข้อมูลลงในฐานข้อมูล
    const result = await pool.query(
      'INSERT INTO transactions (type, item_name, amount, transaction_date, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [type, itemName, parseFloat(amount).toFixed(2), transactionDate, createdAt, updatedAt]
    );

    res.status(201).json({ message: 'บันทึกข้อมูลสำเร็จ', transaction: result.rows[0] });
  } catch (error) {
    console.error('Error saving data', error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาดในการบันทึกข้อมูล' });
  }
});

// Endpoint สำหรับดึงข้อมูลรายการทั้งหมด
app.get('/transactions', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM transactions');
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching data', error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาดในการดึงข้อมูล' });
  }
});



// แก้ไขข้อมูลรายการ
app.put('/transaction/:id', async (req, res) => {
    const { id } = req.params;
    const { type, itemName, amount, transactionDate } = req.body;
  
    if (!type || !itemName || !amount || !transactionDate) {
      return res.status(400).json({ error: 'กรุณากรอกข้อมูลให้ครบถ้วน' });
    }
  
    const updatedAt = moment().format('YYYY-MM-DD HH:mm:ss');
  
    try {
      const result = await pool.query(
        'UPDATE transactions SET type = $1, item_name = $2, amount = $3, transaction_date = $4, updated_at = $5 WHERE id = $6 RETURNING *',
        [type, itemName, parseFloat(amount).toFixed(2), transactionDate, updatedAt, id]
      );
  
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'ไม่พบรายการที่ต้องการแก้ไข' });
      }
  
      res.json({ message: 'แก้ไขข้อมูลสำเร็จ', transaction: result.rows[0] });
    } catch (error) {
      console.error('Error updating data', error);
      res.status(500).json({ error: 'เกิดข้อผิดพลาดในการแก้ไขข้อมูล' });
    }
  });
  
  // ลบข้อมูลรายการ
  app.delete('/transaction/:id', async (req, res) => {
    const { id } = req.params;
  
    try {
      const result = await pool.query('DELETE FROM transactions WHERE id = $1 RETURNING *', [id]);
  
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'ไม่พบรายการที่ต้องการลบ' });
      }
  
      res.json({ message: 'ลบข้อมูลสำเร็จ', transaction: result.rows[0] });
    } catch (error) {
      console.error('Error deleting data', error);
      res.status(500).json({ error: 'เกิดข้อผิดพลาดในการลบข้อมูล' });
    }
  });







  
// รันเซิร์ฟเวอร์
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
