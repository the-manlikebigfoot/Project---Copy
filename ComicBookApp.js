const express = require('express');
const mysql = require('mysql2');
const bodyParser = require('body-parser');
const multer = require('multer');
const path = require('path');
const app = express();

// Create MySQL connection
const connection = mysql.createConnection({
  host: 'sql.freedb.tech',
  user: 'freedb_izannazhan',
  password: 'Q?BbWd35K@EzjKh',
  database: 'freedb_ComicData'
});

connection.connect((err) => {
  if (err) {
    console.error('Error connecting to MySQL:', err);
    return;
  }
  console.log('Connected to MySQL database');
});

// Set up view engine
app.set('view engine', 'ejs');

// Enable static files
app.use(express.static('public'));
app.use(bodyParser.urlencoded({ extended: true }));

// Multer middleware setup for file upload
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, './public/images');
  },
  filename: function (req, file, cb) {
    cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname));
  }
});

const upload = multer({ storage: storage });

// Define routes
app.get('/', (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = 5;
  const offset = (page - 1) * limit;

  const sql = 'SELECT * FROM products LIMIT ?, ?';
  const countSql = 'SELECT COUNT(*) AS count FROM products';

  connection.query(countSql, (countError, countResults) => {
    if (countError) {
      console.error('Database count query error:', countError.message);
      return res.status(500).send('Error retrieving products count');
    }

    const totalProducts = countResults[0].count;
    const totalPages = Math.ceil(totalProducts / limit);

    connection.query(sql, [offset, limit], (error, results) => {
      if (error) {
        console.error('Database query error:', error.message);
        return res.status(500).send('Error retrieving products');
      }

      res.render('index', { products: results, page, totalPages });
    });
  });
});

app.get('/product/:id', (req, res) => {
  const productId = req.params.id;
  const sql = 'SELECT * FROM products WHERE productId = ?';
  connection.query(sql, [productId], (error, results) => {
    if (error) {
      console.error('Database query error:', error.message);
      return res.status(500).send('Error retrieving product by ID');
    }
    if (results.length > 0) {
      res.render('product', { product: results[0] });
    } else {
      res.status(404).send('Product not found');
    }
  });
});

app.get('/addProduct', (req, res) => {
  res.render('addProduct');
});

app.post('/addProduct', upload.single('image'), (req, res) => {
  const { name, issues, price, author, illustrator, publisher } = req.body;
  const image = req.file.filename;
  const sql = 'INSERT INTO products (productName, issues, price, image, author, illustrator, publisher) VALUES (?, ?, ?, ?, ?, ?, ?)';
  connection.query(sql, [name, issues, price, image, author, illustrator, publisher], (error, results) => {
    if (error) {
      console.error('Database insert error:', error.message);
      return res.status(500).send('Error adding product');
    }
    res.redirect('/');
  });
});

app.get('/search', (req, res) => {
  const searchQuery = req.query.query;
  const sql = `
    SELECT * FROM products 
    WHERE productName LIKE ? 
    OR author LIKE ? 
    OR illustrator LIKE ? 
    OR publisher LIKE ?`;

  connection.query(sql, [`%${searchQuery}%`, `%${searchQuery}%`, `%${searchQuery}%`, `%${searchQuery}%`], (error, results) => {
    if (error) {
      console.error('Database search error:', error.message);
      return res.status(500).send('Error searching for products');
    }
    res.render('index', { products: results, page: 1, totalPages: 1 });
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
