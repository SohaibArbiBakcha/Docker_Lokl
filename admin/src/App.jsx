import { Admin, Resource, CustomRoutes } from 'react-admin';
import { BrowserRouter, Route } from 'react-router-dom';
import PeopleIcon from '@mui/icons-material/People';
import GroupsIcon from '@mui/icons-material/Groups';
import EventIcon from '@mui/icons-material/Event';
import ConfirmationNumberIcon from '@mui/icons-material/ConfirmationNumber';
import PaymentIcon from '@mui/icons-material/Payment';
import StarIcon from '@mui/icons-material/Star';
import CategoryIcon from '@mui/icons-material/Category';
import LocationCityIcon from '@mui/icons-material/LocationCity';
import HistoryIcon from '@mui/icons-material/History';

import { authProvider } from './providers/authProvider';
import { dataProvider } from './providers/dataProvider';
import { Dashboard } from './components/Dashboard';
import { LoginPage } from './components/LoginPage';
import { AppLayout } from './components/AppLayout';
import { ChangePasswordPage } from './components/ChangePasswordPage';

import { UserList, UserEdit, UserCreate, UserShow } from './resources/users';
import { GroupList, GroupEdit, GroupCreate, GroupShow } from './resources/groups';
import { EventList, EventEdit, EventCreate, EventShow } from './resources/events';
import { TicketList, TicketEdit, TicketShow } from './resources/tickets';
import { PaymentList, PaymentShow } from './resources/payments';
import { ReviewList, ReviewEdit, ReviewShow } from './resources/reviews';
import { CategoryList, CategoryEdit, CategoryCreate, CategoryShow } from './resources/categories';
import { CityList, CityEdit, CityCreate, CityShow } from './resources/cities';
import { AuditLogList, AuditLogShow } from './resources/audit-logs';

const App = () => (
  // Served under /admin (landing page owns /). The basename MUST be on the
  // router, not on <Admin>: when you bring your own router, react-admin's
  // RouterWrapper ignores its basename prop for route MATCHING (it only feeds
  // link generation), so its routes (/login, /users…) never match /admin/*
  // URLs — the symptom is a grey full-height placeholder and a redirect loop.
  // With the basename here, react-router strips /admin before matching and
  // prepends it to every navigate()/Link, so <Admin> needs no basename at all.
  <BrowserRouter basename="/admin">
    <Admin
      title="Lokl Admin"
      dataProvider={dataProvider}
      authProvider={authProvider}
      dashboard={Dashboard}
      loginPage={LoginPage}
      layout={AppLayout}
      requireAuth
    >
    <Resource
      name="users"
      list={UserList}
      edit={UserEdit}
      create={UserCreate}
      show={UserShow}
      icon={PeopleIcon}
      options={{ label: 'Utilisateurs' }}
    />
    <Resource
      name="groups"
      list={GroupList}
      edit={GroupEdit}
      create={GroupCreate}
      show={GroupShow}
      icon={GroupsIcon}
      options={{ label: 'Groupes' }}
    />
    <Resource
      name="events"
      list={EventList}
      edit={EventEdit}
      create={EventCreate}
      show={EventShow}
      icon={EventIcon}
      options={{ label: 'Événements' }}
    />
    <Resource
      name="tickets"
      list={TicketList}
      edit={TicketEdit}
      show={TicketShow}
      icon={ConfirmationNumberIcon}
      options={{ label: 'Tickets' }}
    />
    <Resource
      name="payments"
      list={PaymentList}
      show={PaymentShow}
      icon={PaymentIcon}
      options={{ label: 'Paiements' }}
    />
    <Resource
      name="reviews"
      list={ReviewList}
      edit={ReviewEdit}
      show={ReviewShow}
      icon={StarIcon}
      options={{ label: 'Avis' }}
    />
    <Resource
      name="categories"
      list={CategoryList}
      edit={CategoryEdit}
      create={CategoryCreate}
      show={CategoryShow}
      icon={CategoryIcon}
      options={{ label: 'Catégories' }}
    />
    <Resource
      name="cities"
      list={CityList}
      edit={CityEdit}
      create={CityCreate}
      show={CityShow}
      icon={LocationCityIcon}
      options={{ label: 'Villes' }}
    />
    <Resource
      name="audit-logs"
      list={AuditLogList}
      show={AuditLogShow}
      icon={HistoryIcon}
      options={{ label: 'Journal d\'audit' }}
    />
      <CustomRoutes>
        <Route path="/change-password" element={<ChangePasswordPage />} />
      </CustomRoutes>
    </Admin>
  </BrowserRouter>
);

export default App;
