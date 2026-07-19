import {
  List, Datagrid, TextField, NumberField, BooleanField,
  Edit, SimpleForm, TextInput, NumberInput, BooleanInput,
  Create, Show, SimpleShowLayout,
} from 'react-admin';

export const CityList = () => (
  <List sort={{ field: 'name_fr', order: 'ASC' }}>
    <Datagrid rowClick="edit" bulkActionButtons={false}>
      <TextField source="name_fr" label="Nom (FR)" />
      <TextField source="name_ar" label="Nom (AR)" />
      <TextField source="region" label="Région" />
      <BooleanField source="is_active" label="Active" />
    </Datagrid>
  </List>
);

export const CityEdit = () => (
  <Edit>
    <SimpleForm>
      <TextInput source="name_fr" label="Nom (FR)" fullWidth />
      <TextInput source="name_ar" label="Nom (AR)" fullWidth />
      <TextInput source="region" label="Région" fullWidth />
      <NumberInput source="lat" label="Latitude" />
      <NumberInput source="lng" label="Longitude" />
      <BooleanInput source="is_active" label="Active" />
    </SimpleForm>
  </Edit>
);

export const CityCreate = () => (
  <Create>
    <SimpleForm>
      <TextInput source="name_fr" label="Nom (FR)" fullWidth required />
      <TextInput source="name_ar" label="Nom (AR)" fullWidth required />
      <TextInput source="region" label="Région" fullWidth required />
      <NumberInput source="lat" label="Latitude" />
      <NumberInput source="lng" label="Longitude" />
    </SimpleForm>
  </Create>
);

export const CityShow = () => (
  <Show>
    <SimpleShowLayout>
      <TextField source="name_fr" label="Nom (FR)" />
      <TextField source="name_ar" label="Nom (AR)" />
      <TextField source="region" label="Région" />
      <NumberField source="lat" label="Latitude" />
      <NumberField source="lng" label="Longitude" />
      <BooleanField source="is_active" label="Active" />
    </SimpleShowLayout>
  </Show>
);
