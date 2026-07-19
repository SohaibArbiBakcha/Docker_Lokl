import {
  List, Datagrid, TextField, DateField, NumberField,
  Show, SimpleShowLayout, SelectInput, ReferenceField,
  useRecordContext,
} from 'react-admin';
import Chip from '@mui/material/Chip';

const methodChoices = [
  { id: 'POST', name: 'POST' },
  { id: 'PUT', name: 'PUT' },
  { id: 'PATCH', name: 'PATCH' },
  { id: 'DELETE', name: 'DELETE' },
];

const auditFilters = [
  <SelectInput source="method" choices={methodChoices} key="method" alwaysOn />,
];

const MethodBadge = () => {
  const record = useRecordContext();
  if (!record) return null;
  const colors = { POST: 'success', PUT: 'info', PATCH: 'warning', DELETE: 'error' };
  return <Chip label={record.method} color={colors[record.method] ?? 'default'} size="small" />;
};

export const AuditLogList = () => (
  <List filters={auditFilters} sort={{ field: 'created_at', order: 'DESC' }}>
    <Datagrid rowClick="show" bulkActionButtons={false}>
      <DateField source="created_at" label="Quand" showTime />
      <ReferenceField source="actor_id" reference="users" label="Acteur" emptyText="—">
        <TextField source="full_name" />
      </ReferenceField>
      <TextField source="actor_role" label="Rôle" />
      <MethodBadge />
      <TextField source="path" label="Chemin" />
      <NumberField source="status" label="Statut" />
    </Datagrid>
  </List>
);

export const AuditLogShow = () => (
  <Show>
    <SimpleShowLayout>
      <DateField source="created_at" label="Quand" showTime />
      <ReferenceField source="actor_id" reference="users" label="Acteur" emptyText="—">
        <TextField source="full_name" />
      </ReferenceField>
      <TextField source="actor_role" label="Rôle" />
      <TextField source="method" label="Méthode" />
      <TextField source="path" label="Chemin" />
      <NumberField source="status" label="Statut HTTP" />
      <TextField source="body" label="Corps de la requête (aseptisé)" emptyText="—" />
    </SimpleShowLayout>
  </Show>
);
