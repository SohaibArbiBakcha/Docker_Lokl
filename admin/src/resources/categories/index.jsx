import {
  List, Datagrid, TextField, BooleanField,
  Edit, SimpleForm, TextInput, BooleanInput,
  Create, Show, SimpleShowLayout,
} from 'react-admin';

export const CategoryList = () => (
  <List sort={{ field: 'name_fr', order: 'ASC' }}>
    <Datagrid rowClick="edit" bulkActionButtons={false}>
      <TextField source="icon" label="Icône" />
      <TextField source="name_fr" label="Nom (FR)" />
      <TextField source="name_ar" label="Nom (AR)" />
      <BooleanField source="is_active" label="Active" />
    </Datagrid>
  </List>
);

export const CategoryEdit = () => (
  <Edit>
    <SimpleForm>
      <TextInput source="name_fr" label="Nom (FR)" fullWidth />
      <TextInput source="name_ar" label="Nom (AR)" fullWidth />
      <TextInput source="icon" label="Icône (emoji)" />
      <TextInput source="color" label="Couleur (hex)" />
      <BooleanInput source="is_active" label="Active" />
    </SimpleForm>
  </Edit>
);

export const CategoryCreate = () => (
  <Create>
    <SimpleForm>
      <TextInput source="name_fr" label="Nom (FR)" fullWidth required />
      <TextInput source="name_ar" label="Nom (AR)" fullWidth required />
      <TextInput source="icon" label="Icône (emoji)" />
      <TextInput source="color" label="Couleur (hex)" defaultValue="#00BCD4" />
    </SimpleForm>
  </Create>
);

export const CategoryShow = () => (
  <Show>
    <SimpleShowLayout>
      <TextField source="name_fr" label="Nom (FR)" />
      <TextField source="name_ar" label="Nom (AR)" />
      <TextField source="icon" label="Icône" />
      <BooleanField source="is_active" label="Active" />
    </SimpleShowLayout>
  </Show>
);
