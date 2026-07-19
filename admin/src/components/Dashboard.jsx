import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';
import Box from '@mui/material/Box';
import { useDashboardStats } from '../hooks/useDashboardStats';

const LOKL_CYAN = '#00BCD4';

const KpiCard = ({ label, value, sub }) => (
  <Card elevation={2} sx={{ borderTop: `3px solid ${LOKL_CYAN}`, height: '100%' }}>
    <CardContent>
      <Typography variant="h4" sx={{ fontWeight: 700, color: LOKL_CYAN }}>{value}</Typography>
      <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>{label}</Typography>
      {sub && <Typography variant="body2" color="text.secondary">{sub}</Typography>}
    </CardContent>
  </Card>
);

const MONTH_NAMES = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];

export const Dashboard = () => {
  const { stats, isLoading } = useDashboardStats();

  if (isLoading) return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}>
      <CircularProgress sx={{ color: LOKL_CYAN }} />
    </div>
  );

  if (!stats) return <div style={{ padding: '2rem' }}>Erreur de chargement</div>;

  const growthData = stats.user_growth.map((g) => ({
    name: `${MONTH_NAMES[g._id.month - 1]} ${g._id.year}`,
    Utilisateurs: g.count,
  }));

  const kpis = [
    { label: 'Utilisateurs', value: stats.users.total, sub: `${stats.users.banned} banni(s)` },
    { label: 'Groupes actifs', value: stats.groups.active, sub: `${stats.groups.total} au total` },
    { label: 'Événements à venir', value: stats.events.upcoming, sub: `${stats.events.total} au total` },
    { label: 'Revenus', value: `${stats.payments.revenue_mad} MAD`, sub: `Commission: ${stats.payments.commission_mad} MAD` },
    { label: 'Tickets', value: stats.tickets.total },
    { label: 'Paiements réussis', value: stats.payments.successful, sub: `/ ${stats.payments.total} total` },
    { label: 'Avis signalés', value: stats.moderation.flagged_reviews, sub: 'À modérer' },
  ];

  return (
    <div style={{ padding: '1.5rem' }}>
      <Typography variant="h5" sx={{ fontWeight: 700, marginBottom: '1.5rem' }}>
        Tableau de bord —{' '}
        <Box component="span" sx={{ color: LOKL_CYAN }}>Lokl</Box>
      </Typography>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
        gap: '1rem',
        marginBottom: '2rem',
      }}>
        {kpis.map((kpi) => (
          <KpiCard key={kpi.label} label={kpi.label} value={kpi.value} sub={kpi.sub} />
        ))}
      </div>

      {growthData.length > 0 && (
        <Card elevation={2}>
          <CardContent>
            <Typography variant="h6" sx={{ fontWeight: 600, marginBottom: '1rem' }}>
              Croissance utilisateurs (6 mois)
            </Typography>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={growthData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="Utilisateurs" fill={LOKL_CYAN} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
