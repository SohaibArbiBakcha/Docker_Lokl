import { useState } from 'react';
import { useNotify } from 'react-admin';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';
import Box from '@mui/material/Box';
import { API_URL, httpClient } from '../providers/httpClient';

const MIN_PASSWORD_LENGTH = 8;

export const ChangePasswordPage = () => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const notify = useNotify();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (newPassword.length < MIN_PASSWORD_LENGTH) {
      notify(`Le nouveau mot de passe doit contenir au moins ${MIN_PASSWORD_LENGTH} caractères`, { type: 'warning' });
      return;
    }
    if (newPassword !== confirm) {
      notify('Les deux mots de passe ne correspondent pas', { type: 'warning' });
      return;
    }

    setLoading(true);
    try {
      await httpClient(`${API_URL}/users/me/password`, {
        method: 'PATCH',
        body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
      });
      notify('Mot de passe mis à jour', { type: 'success' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirm('');
    } catch (error) {
      notify(error?.body?.error?.message ?? 'Échec de la mise à jour', { type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', mt: 6 }}>
      <Card sx={{ width: 440 }}>
        <CardContent sx={{ p: 4 }}>
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
            Changer le mot de passe
          </Typography>
          <form onSubmit={handleSubmit}>
            <TextField
              label="Mot de passe actuel"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              fullWidth
              required
              margin="normal"
              autoComplete="current-password"
            />
            <TextField
              label="Nouveau mot de passe"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              fullWidth
              required
              margin="normal"
              autoComplete="new-password"
              helperText={`Minimum ${MIN_PASSWORD_LENGTH} caractères`}
            />
            <TextField
              label="Confirmer le nouveau mot de passe"
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              fullWidth
              required
              margin="normal"
              autoComplete="new-password"
            />
            <Button type="submit" variant="contained" fullWidth disabled={loading} sx={{ mt: 2 }}>
              {loading ? <CircularProgress size={22} /> : 'Mettre à jour'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </Box>
  );
};
