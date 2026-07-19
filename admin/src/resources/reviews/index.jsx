import {
  List, Datagrid, TextField, NumberField, BooleanField, DateField,
  Edit, SimpleForm, BooleanInput, TextInput,
  Show, SimpleShowLayout, SearchInput,
  useRecordContext,
} from 'react-admin';

const reviewFilters = [
  <SearchInput source="q" alwaysOn key="q" />,
];

const Stars = () => {
  const record = useRecordContext();
  if (!record) return null;
  const rating = record.rating ?? 0;
  return <span>{'★'.repeat(rating)}{'☆'.repeat(5 - rating)}</span>;
};

export const ReviewList = () => (
  <List filters={reviewFilters} sort={{ field: 'created_at', order: 'DESC' }}>
    <Datagrid rowClick="edit" bulkActionButtons={false}>
      <Stars />
      <TextField source="comment" label="Commentaire" />
      <BooleanField source="is_flagged" label="Signalé" />
      <DateField source="created_at" label="Date" />
    </Datagrid>
  </List>
);

export const ReviewEdit = () => (
  <Edit>
    <SimpleForm>
      <BooleanInput source="is_flagged" label="Signalé" />
      <TextInput source="flag_reason" label="Raison du signalement" fullWidth />
    </SimpleForm>
  </Edit>
);

export const ReviewShow = () => (
  <Show>
    <SimpleShowLayout>
      <NumberField source="rating" label="Note" />
      <TextField source="comment" label="Commentaire" />
      <BooleanField source="is_flagged" label="Signalé" />
      <TextField source="flag_reason" label="Raison" />
      <DateField source="created_at" label="Date" showTime />
    </SimpleShowLayout>
  </Show>
);
