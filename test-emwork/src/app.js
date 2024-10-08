// app.js
const express = require('express');
const moment = require('moment');
const { Pool } = require('pg');

const cors = require('cors'); // Import the CORS module


// สร้างการเชื่อมต่อกับฐานข้อมูล PostgreSQL โดยใช้ข้อมูลจาก ElephantSQL
const pool = new Pool({
  connectionString: 'postgres://jofnlpey:NweQLLRaE3LQaS89fEPdU0arxrzY9Jru@john.db.elephantsql.com/jofnlpey',
//connectionString:'postgres://mankehwr:qjyjN4ioe5noq2GYT80TUHCY-ugIld2O@tiny.db.elephantsql.com/mankehwr'
});

const app = express();
const port = 3000;
app.use(cors());
// เพื่อให้สามารถรับข้อมูลแบบ JSON ได้
app.use(express.json());

// Endpoint สำหรับบันทึกข้อมูล
app.post('/transaction', async (req, res) => {
    const { type, itemName, amount, transactionDate } = req.body;
  
    // Log request data
    console.log('Received request:', { type, itemName, amount, transactionDate });
  
    // Validate input data
    if (!type || !itemName || !amount || !transactionDate) {
      console.log('Validation failed: missing fields');
      return res.status(400).json({ error: 'กรุณากรอกข้อมูลให้ครบถ้วน' });
    }
  
    const createdAt = moment().format('YYYY-MM-DD HH:mm:ss');
    const month = new Date(transactionDate).getMonth() + 1; // Get month (1-12)
    const year = new Date(transactionDate).getFullYear();   // Get year
  
    // Log processed date
    console.log('Processed transaction date:', { month, year, createdAt });
  
    try {
      // **Make sure the amount is treated as a number**
      const parsedAmount = Number(amount);
      console.log('parsedAmount:',parsedAmount) ;// Convert amount to number explicitly
      if (isNaN(parsedAmount)) {
        console.log('Invalid amount:', amount);
        return res.status(400).json({ error: 'จำนวนเงินไม่ถูกต้อง' }); // "Invalid amount"
      }
  
      // Save the transaction data
      console.log('Attempting to insert transaction into the database...');
      const result = await pool.query(
        'INSERT INTO transactions (type, item_name, amount, transaction_date, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
        [type, itemName, parsedAmount, transactionDate, createdAt, createdAt]
      );
  
      console.log('Transaction inserted:', result.rows[0]);
  
      // Initialize totals
      let totalIncome = 0;
      let totalExpenses = 0;
  
      // Fetch current totals for the month and year
      console.log('Fetching current totals from transaction_summary...');
      const summaryResult = await pool.query(
        'SELECT total_income, total_expenses FROM transaction_summary WHERE month = $1 AND year = $2',
        [month, year]
      );
  
      // Log the retrieved summary (if any)
      if (summaryResult.rows.length > 0) {
        console.log('Existing summary found:', summaryResult.rows[0]);
      } else {
        console.log('No existing summary found for month:', month, 'year:', year);
      }
  
      // Check if summary already exists
      if (summaryResult.rows.length > 0) {
        // Update existing summary
        totalIncome = summaryResult.rows[0].total_income;   // Get existing income
        totalExpenses = summaryResult.rows[0].total_expenses;  // Get existing expenses
  
        console.log('Updating totals based on transaction type...');
        if (type === 'รายรับ') {
          totalIncome += parsedAmount;
          console.log('Income updated:', totalIncome);
        } else if (type === 'รายจ่าย') {
          totalExpenses += parsedAmount;
          console.log('Expenses updated:', totalExpenses);
        }
  
        const totalBalance = totalIncome - totalExpenses;
        console.log('Total balance calculated:', totalBalance);
  
        // Update the summary
        console.log('Updating transaction_summary for month:', month, 'year:', year);
        await pool.query(
          'UPDATE transaction_summary SET total_income = $1, total_expenses = $2, total_balance = $3 WHERE month = $4 AND year = $5',
          [totalIncome, totalExpenses, totalBalance, month, year]
        );
  
        console.log('Summary updated successfully.');
      } else {
        // Create a new summary
        console.log('Creating a new transaction summary...');
        if (type === 'รายรับ') {
          totalIncome = parsedAmount;
        } else if (type === 'รายจ่าย') {
          totalExpenses = parsedAmount;
        }
  
        const totalBalance = totalIncome - totalExpenses;
        console.log('Total income:', totalIncome, 'Total expenses:', totalExpenses, 'Total balance:', totalBalance);
  
        // Insert the new summary
        await pool.query(
          'INSERT INTO transaction_summary (month, year, total_income, total_expenses, total_balance) VALUES ($1, $2, $3, $4, $5)',
          [month, year, totalIncome, totalExpenses, totalBalance]
        );
  
        console.log('New summary created successfully.');
      }
  
      // Respond with success
      res.status(201).json({ message: 'บันทึกข้อมูลสำเร็จ', transaction: result.rows[0] });
    } catch (error) {
      // Log the error
      console.error('Error saving data:', error);
      res.status(500).json({ error: 'เกิดข้อผิดพลาดในการบันทึกข้อมูล' });
    }
  });
  


// Endpoint สำหรับดึงข้อมูลรายการทั้งหมด
app.get('/transactions', async (req, res) => {
    try {
      const { month, year } = req.query;
  
      // Base query for transactions
      let transactionQuery = 'SELECT * FROM transactions';
      let summaryQuery = 'SELECT * FROM transaction_summary';
  
      // If month and year are provided, filter the transactions and summaries
      if (month && year) {
        transactionQuery += ` WHERE EXTRACT(MONTH FROM transaction_date) = $1 AND EXTRACT(YEAR FROM transaction_date) = $2`;
        summaryQuery += ` WHERE month = $1 AND year = $2`;
      }
  
      // Fetch transactions
      const transactionsResult = await pool.query(transactionQuery, month && year ? [month, year] : []);
      const transactions = transactionsResult.rows;
  
      // Fetch summaries
      const summariesResult = await pool.query(summaryQuery, month && year ? [month, year] : []);
      const summaries = summariesResult.rows;
  
      // Send both transactions and summaries in the response
      res.json({
        transactions,
        summaries
      });
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
      // Fetch the old transaction to determine its type and amount
      const oldTransactionResult = await pool.query('SELECT type, amount, transaction_date FROM transactions WHERE id = $1', [id]);
      
      if (oldTransactionResult.rows.length === 0) {
          return res.status(404).json({ error: 'ไม่พบรายการที่ต้องการแก้ไข' });
      }

      const oldTransaction = oldTransactionResult.rows[0];
      const oldType = oldTransaction.type;
      const oldAmount = parseFloat(oldTransaction.amount);
      const oldDate = new Date(oldTransaction.transaction_date);
      const month = oldDate.getMonth() + 1; // Get month (1-12)
      const year = oldDate.getFullYear(); // Get year

      // Update the transaction
      const result = await pool.query(
          'UPDATE transactions SET type = $1, item_name = $2, amount = $3, transaction_date = $4, updated_at = $5 WHERE id = $6 RETURNING *',
          [type, itemName, parseFloat(amount).toFixed(2), transactionDate, updatedAt, id]
      );

      // Update the summary based on the transaction type
      let totalIncome = 0;
      let totalExpenses = 0;

      // Fetch current totals for the month and year
      const summaryResult = await pool.query(
          'SELECT total_income, total_expenses FROM transaction_summary WHERE month = $1 AND year = $2',
          [month, year]
      );

      if (summaryResult.rows.length > 0) {
          totalIncome = summaryResult.rows[0].total_income;
          totalExpenses = summaryResult.rows[0].total_expenses;

          // Update totals based on the type of the old transaction
          if (oldType === 'รายรับ') {
              totalIncome -= oldAmount; // Remove the old amount
          } else if (oldType === 'รายจ่าย') {
              totalExpenses -= oldAmount; // Remove the old amount
          }

          // Add the new amount
          if (type === 'รายรับ') {
              totalIncome += parseFloat(amount);
          } else if (type === 'รายจ่าย') {
              totalExpenses += parseFloat(amount);
          }

          const totalBalance = totalIncome - totalExpenses;

          // Update the summary
          await pool.query(
              'UPDATE transaction_summary SET total_income = $1, total_expenses = $2, total_balance = $3 WHERE month = $4 AND year = $5',
              [totalIncome, totalExpenses, totalBalance, month, year]
          );
      }

      res.json({ message: 'แก้ไขข้อมูลสำเร็จ', transaction: result.rows[0] });
  } catch (error) {
      console.error('Error updating data', error);
      res.status(500).json({ error: 'เกิดข้อผิดพลาดในการแก้ไขข้อมูล' });
  }
});


app.delete('/transaction/:id', async (req, res) => {
  const { id } = req.params;

  try {
      // Fetch the transaction to determine its type and amount
      const transactionResult = await pool.query('SELECT type, amount, transaction_date FROM transactions WHERE id = $1', [id]);
      
      if (transactionResult.rows.length === 0) {
          return res.status(404).json({ error: 'ไม่พบรายการที่ต้องการลบ' });
      }

      const transaction = transactionResult.rows[0];
      const type = transaction.type;
      const amount = parseFloat(transaction.amount);
      const transactionDate = new Date(transaction.transaction_date);
      const month = transactionDate.getMonth() + 1; // Get month (1-12)
      const year = transactionDate.getFullYear(); // Get year

      // Delete the transaction
      const result = await pool.query('DELETE FROM transactions WHERE id = $1 RETURNING *', [id]);

      // Update the summary based on the transaction type
      let totalIncome = 0;
      let totalExpenses = 0;

      // Fetch current totals for the month and year
      const summaryResult = await pool.query(
          'SELECT total_income, total_expenses FROM transaction_summary WHERE month = $1 AND year = $2',
          [month, year]
      );

      if (summaryResult.rows.length > 0) {
          totalIncome = summaryResult.rows[0].total_income;
          totalExpenses = summaryResult.rows[0].total_expenses;

          // Adjust totals based on the type of the deleted transaction
          if (type === 'รายรับ') {
              totalIncome -= amount; // Remove the amount from total income
          } else if (type === 'รายจ่าย') {
              totalExpenses -= amount; // Remove the amount from total expenses
          }

          const totalBalance = totalIncome - totalExpenses;

          // Update the summary
          await pool.query(
              'UPDATE transaction_summary SET total_income = $1, total_expenses = $2, total_balance = $3 WHERE month = $4 AND year = $5',
              [totalIncome, totalExpenses, totalBalance, month, year]
          );

          console.log(`Updated summary for month: ${month}, year: ${year}, total_income: ${totalIncome}, total_expenses: ${totalExpenses}`);
      } else {
          console.log(`No summary found for month: ${month}, year: ${year}. No updates made.`);
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
