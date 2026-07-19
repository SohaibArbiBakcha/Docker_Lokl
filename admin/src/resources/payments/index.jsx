import {
  List, Datagrid, NumberField, DateField, TextField, ReferenceField,
  Show, SimpleShowLayout, SearchInput, SelectInput,
  useRecordContext,
} from 'react-admin';
import Chip from '@mui/material/Chip';

const gatewayChoices = [
  { id: 'cmi', name: 'CMI' },
  { id: 'cashplus', name: 'CashPlus' },
  { id: 'stripe', name: 'Stripe' },
];

const statusChoices = [
  { id: 'pending', name: 'En attente' },
  { id: 'success', name: 'Réussi' },
  { id: 'failed', name: 'Échoué' },
  { id: 'refunded', name: 'Remboursé' },
];

const paymentFilters = [
  <SearchInput source="q" alwaysOn key="q" />,
  <SelectInput source="gateway" choices={gatewayChoices} key="gateway" />,
  <SelectInput source="status" choices={statusChoices} key="status" />,
];

const StatusBadge = () => {
  const record = useRecordContext();
  if (!record) return null;
  const colors = {
    pending: 'default', success: 'success', failed: 'error', refunded: 'warning',
  };
  return <Chip label={record.status} color={colors[record.status] ?? 'default'} size="small" />;
};

const AmountMAD = () => {
  const record = useRecordContext();
  if (!record?.amount_centimes) return null;
  return <span>{(record.amount_centimes / 100).toFixed(2)} MAD</span>;
};

export const PaymentList = () => (
  <List filters={paymentFilters} sort={{ field: 'created_at', order: 'DESC' }}>
    <Datagrid rowClick="show" bulkActionButtons={false}>
      <AmountMAD />
      <NumberField source="amount_centimes" label="Centimes" />
      <StatusBadge />
      <DateField source="created_at" label="Date" showTime />
    </Datagrid>
  </List>
);

export const PaymentShow = () => (
  <Show>
    <SimpleShowLayout>
      <AmountMAD label="Montant" />
      <StatusBadge label="Statut" />
      <TextField source="gateway" label="Passerelle" />
      <TextField source="gateway_ref" label="Référence passerelle" emptyText="—" />
      <ReferenceField source="user_id" reference="users" label="Utilisateur" emptyText="—">
        <TextField source="full_name" />
      </ReferenceField>
      <NumberField source="amount_centimes" label="Montant (centimes)" />
      <NumberField source="commission_centimes" label="Commission (centimes)" />
      <DateField source="created_at" label="Date" showTime />
      <DateField source="refunded_at" label="Remboursé le" showTime />
    </SimpleShowLayout>
  </Show>
);
