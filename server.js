const express = require('express');
const app = express();

require('dotenv').config();

pool = require('./db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const authenticateToken = require('./authmid'); 

app.use(express.json());


app.post('/auth/register', async (req, res) => {
  try {
    const { username, password } = req.body;

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert the new user into the database
    const results = await pool.query('INSERT INTO users (username, password_hash) VALUES ($1, $2) RETURNING *', [username,   hashedPassword]);
    res.status(201).json({message : 'User registered successfully',

      user:results.rows[0]});
  } catch (error) {
    
    if (error.code === '23505') { // Unique violation error code
      res.status(400).json({ error: 'Username already exists' });
    } else {
      console.error('Error registering user:', error.message);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
});


app.post('/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    const results = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
    if (results.rows.length === 0) {
      return res.status(401).json({ error: 'Username or password is incorrect' });
    }

    const user = results.rows[0];

    const paswordMatch = await bcrypt.compare(password, user.password_hash);

    if (!paswordMatch) {
      return res.status(401).json({ error: 'Username or password is incorrect' });
    }

    const token = jwt.sign({ userId: user.id ,username: user.username}, process.env.JWT_SECRET, { expiresIn: '1h' });

    res.json({ message: 'Login successful', token });
  } catch (error) {
    console.error('Error logging in:', error.message);
    res.status(500).json({ error: 'Internal server error' });
    
  }
});



app.get('/tasks', authenticateToken, async (req, res) => {
  try {
    const results = await pool.query('SELECT * FROM tasks');
    res.json(results.rows);
  } catch (error) {
    console.error('Error fetching tasks:', error.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});


app.get('/tasks/:id',authenticateToken,async (req, res) => {
  try {
    const results = await pool.query('SELECT * FROM tasks WHERE id = $1', [Number(req.params.id)]);
    if (results.rows.length === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }
    res.json(results.rows[0]);
  } catch (error) {
    console.error('Error fetching task:', error.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/tasks', authenticateToken, async (req, res) => {
  try {
    if(typeof req.body.title !== 'string' || typeof req.body.completed !== 'boolean') {
    return res.status(400).json({ error: 'Invalid task data' });
  }

    const results = await pool.query('INSERT INTO tasks (title, completed) VALUES ($1, $2) RETURNING *', [req.body.title, req.body.completed]);
    res.status(201).json(results.rows[0]);
  } catch (error) {
    console.error('Error creating task:', error.message);
    res.status(500).json({ error: 'Internal server error' });
  }

});

app.patch('/tasks/:id', authenticateToken, async (req, res) => {
  try {
    const Id = Number(req.params.id);
    const results = await pool.query('SELECT * FROM tasks WHERE id = $1', [Id]);
    

    const obj = results.rows[0];
    const task=obj.find((task) => task.id === Id);

    if (results.rows.length === 0||!task) {
      return res.status(404).json({ error: 'Task not found' });
    }
    

    if (typeof req.body.title !== 'string' || typeof req.body.completed !== 'boolean') {
      return res.status(400).json({ error: 'Invalid task data' });
    }

    const updatedTask = task;

    if (req.body.title !== undefined) {
      updatedTask.title = req.body.title;
    }

    if (req.body.completed !== undefined) {
      updatedTask.completed = req.body.completed;
    }

    const updateResults = await pool.query('UPDATE tasks SET title = $1, completed = $2 WHERE id = $3 RETURNING *', [updatedTask.title, updatedTask.completed, Id]);
    res.json(updateResults.rows[0]);
  } catch (error) {
    console.error('Error updating task:', error.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.delete('/tasks/:id', authenticateToken, async (req, res) => {
  try {
    const Id = Number(req.params.id);
    const results = await pool.query('SELECT * FROM tasks WHERE id = $1', [Id]);

    if (results.rows.length === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }

    await pool.query('DELETE FROM tasks WHERE id = $1', [Id]);
    res.json({ message: 'Task deleted successfully', task: results.rows[0] });
  } catch (error) {
    console.error('Error deleting task:', error.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.use((err, req, res, next) => {
  console.error('Unhandled error:', err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(3000, () => {
  console.log('Server is running on port 3000');
}); 