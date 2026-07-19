import { useState } from 'react';
import { useLogin, useNotify } from 'react-admin';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';

const LOKL_CYAN = '#00BCD4';

export const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const login = useLogin();
  const notify = useNotify();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login({ username: email, password });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Identifiants invalides';
      notify(message, { type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
      }}
    >
      <Card sx={{ width: 380, borderRadius: 3, overflow: 'hidden' }}>
        <Box sx={{ background: LOKL_CYAN, py: 3, textAlign: 'center' }}>
          <Typography variant="h4" sx={{ color: '#1a1a2e', fontWeight: 900, letterSpacing: 2 }}>
            Lokl
          </Typography>
          <Typography variant="caption" sx={{ color: '#1a1a2e', opacity: 0.8 }}>
            Back-office Admin
          </Typography>
        </Box>

        <CardContent sx={{ p: 4 }}>
          <form onSubmit={handleSubmit}>
            <TextField
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              fullWidth
              required
              margin="normal"
              autoComplete="email"
              autoFocus
            />
            <TextField
              label="Mot de passe"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              fullWidth
              required
              margin="normal"
              autoComplete="current-password"
            />
            <Button
              type="submit"
              fullWidth
              variant="contained"
              disabled={loading}
              sx={{
                mt: 3,
                py: 1.5,
                background: LOKL_CYAN,
                color: '#1a1a2e',
                fontWeight: 700,
                '&:hover': { background: '#00acc1' },
              }}
            >
              {loading ? <CircularProgress size={22} sx={{ color: '#1a1a2e' }} /> : 'Se connecter'}
            </Button>
          </form>

          <Typography variant="caption" display="block" textAlign="center" sx={{ mt: 2, color: 'text.secondary' }}>
            Réservé aux administrateurs Lokl
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
};
