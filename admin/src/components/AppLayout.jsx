import { Layout, UserMenu, Logout, MenuItemLink } from 'react-admin';
import LockIcon from '@mui/icons-material/Lock';

const LoklUserMenu = () => (
  <UserMenu>
    <MenuItemLink
      to="/change-password"
      primaryText="Changer le mot de passe"
      leftIcon={<LockIcon />}
    />
    <Logout />
  </UserMenu>
);

export const AppLayout = ({ children }) => (
  <Layout userMenu={<LoklUserMenu />}>{children}</Layout>
);
