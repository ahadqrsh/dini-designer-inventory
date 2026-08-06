import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// Service Role Client (Bypasses RLS for administrative user creation)
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Middleware: Verify Admin Access via JWT
async function verifyAdmin(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid token format' });
  }

  const token = authHeader.split(' ')[1];
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);

  if (error || !user) {
    return res.status(401).json({ error: 'Invalid or expired session' });
  }

  const { data: profile } = await supabaseAdmin
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'Admin') {
    return res.status(403).json({ error: 'Forbidden: Admin privilege required' });
  }

  req.adminUser = user;
  next();
}

// POST /admin/create-employee
app.post('/admin/create-employee', verifyAdmin, async (req, res) => {
  const { email, password, name, phone, role } = req.body;

  if (!email || !password || !name || !role) {
    return res.status(400).json({ error: 'Missing required parameters' });
  }

  try {
    // 1. Create user in Supabase Auth
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true
    });

    if (authError) return res.status(400).json({ error: authError.message });

    // 2. Insert record into public.users
    const { error: dbError } = await supabaseAdmin
      .from('users')
      .insert([{ id: authData.user.id, email, name, phone, role }]);

    if (dbError) {
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
      return res.status(500).json({ error: dbError.message });
    }

    return res.status(201).json({ message: 'Employee created successfully', userId: authData.user.id });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Backend running on port ${PORT}`));