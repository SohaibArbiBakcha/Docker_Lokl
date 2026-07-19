import {
  List, Datagrid, TextField, EmailField, BooleanField, DateField,
  Edit, SimpleForm, TextInput, SelectInput, BooleanInput,
  Create, Show, SimpleShowLayout, SearchInput,
  useRecordContext, usePermissions, Toolbar, SaveButton,
} from 'react-admin';
import Chip from '@mui/material/Chip';
import WorkspacePremiumIcon from '@mui/icons-material/WorkspacePremium';

const roleChoices = [
  { id: 'member', name: 'Membre' },
  { id: 'organizer', name: 'Organisateur' },
  { id: 'moderator', name: 'Modérateur' },
  { id: 'admin', name: 'Admin' },
];

const langChoices = [
  { id: 'fr', name: 'Français' },
  { id: 'ar', name: 'Arabe' },
];

const premiumChoices = [
  { id: true, name: 'Premium' },
  { id: false, name: 'Standard' },
];

const userFilters = [
  <SearchInput source="q" alwaysOn key="q" />,
  <SelectInput source="role" choices={roleChoices} key="role" />,
  <SelectInput source="is_premium" label="Premium" choices={premiumChoices} key="premium" />,
];

const PremiumRequestBadge = () => {
  const record = useRecordContext();
  if (!record?.premium_requested_at || record?.is_premium) return null;
  return <Chip label="Demande premium" color="warning" size="small" variant="outlined" />;
};

// Shown in the edit form only while a request is pending (not premium yet) —
// tells the admin when the user asked, since there's no payment to trigger this.
const PremiumRequestDate = () => {
  const record = useRecordContext();
  if (!record?.premium_requested_at || record?.is_premium) return null;
  return (
    <Chip
      label={`Demande premium reçue le ${new Date(record.premium_requested_at).toLocaleDateString('fr-FR')}`}
      color="warning"
      variant="outlined"
      sx={{ mb: 2 }}
    />
  );
};

const RoleBadge = () => {
  const record = useRecordContext();
  if (!record) return null;
  const colors = {
    member: 'default', organizer: 'primary', moderator: 'warning', admin: 'error',
  };
  return <Chip label={record.role} color={colors[record.role] ?? 'default'} size="small" />;
};

const PremiumBadge = ({ label: _label }) => {
  const record = useRecordContext();
  if (!record?.is_premium) return null;
  return (
    <Chip
      icon={<WorkspacePremiumIcon sx={{ '&&': { color: '#B8860B' } }} />}
      label="Premium"
      size="small"
      sx={{ bgcolor: '#FFF3D6', color: '#8B6914', fontWeight: 700 }}
    />
  );
};

export const UserList = () => (
  <List filters={userFilters} sort={{ field: 'created_at', order: 'DESC' }}>
    <Datagrid rowClick="edit" bulkActionButtons={false}>
      <TextField source="full_name" label="Nom" />
      <EmailField source="email" />
      <RoleBadge />
      <PremiumBadge label="Premium" />
      <PremiumRequestBadge label="Demande premium" />
      <BooleanField source="is_verified" label="Vérifié" />
      <BooleanField source="is_banned" label="Banni" />
      <DateField source="created_at" label="Inscrit le" />
    </Datagrid>
  </List>
);

export const UserEdit = () => {
  // Backend enforces this too (requireSuperAdmin on PATCH /:id/role) —
  // hiding the field just keeps moderators from hitting a guaranteed 403.
  const { permissions } = usePermissions();
  const isSuperAdmin = permissions === 'admin';

  // Moderators can't delete accounts — drop the default delete button
  const saveOnlyToolbar = (
    <Toolbar>
      <SaveButton />
    </Toolbar>
  );

  return (
    <Edit>
      <SimpleForm toolbar={isSuperAdmin ? undefined : saveOnlyToolbar}>
        <TextInput source="full_name" label="Nom complet" fullWidth />
        <TextInput source="email" label="Email" fullWidth />
        <TextInput source="phone" label="Téléphone" />
        {isSuperAdmin && <SelectInput source="role" choices={roleChoices} />}
        <SelectInput source="lang" choices={langChoices} />
        <BooleanInput
          source="is_premium"
          label="Compte premium (participants, messages privés, promotion d'événements)"
        />
        <PremiumRequestDate />
        <BooleanInput source="is_verified" label="Email vérifié" />
        <BooleanInput source="is_banned" label="Compte banni" />
        <BooleanInput source="is_organizer_verified" label="Organisateur vérifié" />
        <TextInput source="bio_fr" label="Bio (FR)" multiline fullWidth />
        <TextInput source="bio_ar" label="Bio (AR)" multiline fullWidth />
      </SimpleForm>
    </Edit>
  );
};

export const UserCreate = () => (
  <Create>
    <SimpleForm>
      <TextInput source="full_name" label="Nom complet" fullWidth />
      <TextInput source="email" label="Email" fullWidth />
      <TextInput source="password" label="Mot de passe" type="password" fullWidth />
      <SelectInput source="role" choices={roleChoices} defaultValue="member" />
      <SelectInput source="lang" choices={langChoices} defaultValue="fr" />
    </SimpleForm>
  </Create>
);

export const UserShow = () => (
  <Show>
    <SimpleShowLayout>
      <TextField source="full_name" label="Nom" />
      <EmailField source="email" />
      <TextField source="phone" label="Téléphone" />
      <TextField source="role" label="Rôle" />
      <BooleanField source="is_premium" label="Premium" />
      <BooleanField source="is_verified" label="Vérifié" />
      <BooleanField source="is_banned" label="Banni" />
      <DateField source="created_at" label="Inscrit le" showTime />
    </SimpleShowLayout>
  </Show>
);
