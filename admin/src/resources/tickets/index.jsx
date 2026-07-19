import {
  List, Datagrid, TextField, NumberField, DateField,
  Edit, SimpleForm, SelectInput, Show, SimpleShowLayout, SearchInput,
  useRecordContext,
} from 'react-admin';
import { QRCodeSVG } from 'qrcode.react';
import Box from '@mui/material/Box';

// The QR image an organizer would scan — same payload as the mobile app renders
const TicketQr = () => {
  const record = useRecordContext();
  if (!record?.qr_code) return null;
  return (
    <Box sx={{ p: 2, bgcolor: '#fff', display: 'inline-block', border: '1px solid #eee', borderRadius: 1 }}>
      <QRCodeSVG value={record.qr_code} size={180} />
    </Box>
  );
};

const statusChoices = [
  { id: 'pending', name: 'En attente' },
  { id: 'confirmed', name: 'Confirmé' },
  { id: 'cancelled', name: 'Annulé' },
  { id: 'used', name: 'Utilisé' },
];

const typeChoices = [
  { id: 'standard', name: 'Standard' },
  { id: 'vip', name: 'VIP' },
];

const ticketFilters = [
  <SearchInput source="q" alwaysOn key="q" />,
  <SelectInput source="status" choices={statusChoices} key="status" />,
];

export const TicketList = () => (
  <List filters={ticketFilters} sort={{ field: 'created_at', order: 'DESC' }}>
    <Datagrid rowClick="show" bulkActionButtons={false}>
      <TextField source="qr_code" label="QR Code" />
      <TextField source="ticket_type" label="Type" />
      <NumberField source="price_centimes" label="Prix (centimes)" />
      <TextField source="status" label="Statut" />
      <DateField source="created_at" label="Créé le" />
    </Datagrid>
  </List>
);

export const TicketEdit = () => (
  <Edit>
    <SimpleForm>
      <SelectInput source="status" choices={statusChoices} label="Statut" />
      <SelectInput source="ticket_type" choices={typeChoices} label="Type" />
    </SimpleForm>
  </Edit>
);

export const TicketShow = () => (
  <Show>
    <SimpleShowLayout>
      <TicketQr label="QR" />
      <TextField source="qr_code" label="Code" />
      <TextField source="ticket_type" label="Type" />
      <NumberField source="price_centimes" label="Prix (centimes)" />
      <TextField source="status" label="Statut" />
      <DateField source="created_at" label="Créé le" showTime />
      <DateField source="checked_in_at" label="Check-in" showTime />
    </SimpleShowLayout>
  </Show>
);
