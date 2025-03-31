const express = require('express');
const mongoose = require('mongoose');
const morgan = require('morgan');
const postsRouter = require('./routes/posts');
require('dotenv').config();

const app = express();

mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

app.use(express.json());
app.use(morgan('tiny'));
app.use('/posts', postsRouter);

app.use((err, req, res, next) => {
  res.status(err.status || 500).json({ error: err.message || 'Unexpected error' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
