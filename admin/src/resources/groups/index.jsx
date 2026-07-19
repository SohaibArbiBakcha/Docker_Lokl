import {
  List, Datagrid, TextField, BooleanField, DateField, NumberField,
  Edit, SimpleForm, TextInput, BooleanInput,
  Create, Show, SimpleShowLayout, SearchInput,
  ReferenceInput, SelectInput, required,
} from 'react-admin';

const groupFilters = [
  <SearchInput source="q" alwaysOn key="q" />,
];

export const GroupList = () => (
  <List filters={groupFilters} sort={{ field: 'created_at', order: 'DESC' }}>
    <Datagrid rowClick="edit" bulkActionButtons={false}>
      <TextField source="name" label="Nom" />
      <NumberField source="member_count" label="Membres" />
      <BooleanField source="is_private" label="Privé" />
      <BooleanField source="is_active" label="Actif" />
      <DateField source="created_at" label="Créé le" />
    </Datagrid>
  </List>
);

export const GroupEdit = () => (
  <Edit>
    <SimpleForm>
      <TextInput source="name" label="Nom" fullWidth />
      <TextInput source="description_fr" label="Description (FR)" multiline fullWidth />
      <TextInput source="description_ar" label="Description (AR)" multiline fullWidth />
      <BooleanInput source="is_private" label="Groupe privé" />
      <BooleanInput source="is_active" label="Actif" />
    </SimpleForm>
  </Edit>
);

export const GroupCreate = () => (
  <Create>
    <SimpleForm>
      <TextInput source="name" label="Nom" fullWidth validate={required()} />
      <TextInput source="description_fr" label="Description (FR)" multiline fullWidth />
      <TextInput source="description_ar" label="Description (AR)" multiline fullWidth />
      <ReferenceInput source="category_id" reference="categories">
        <SelectInput label="Catégorie" optionText="name_fr" validate={required()} />
      </ReferenceInput>
      <ReferenceInput source="city_id" reference="cities">
        <SelectInput label="Ville" optionText="name_fr" validate={required()} />
      </ReferenceInput>
      <BooleanInput source="is_private" label="Groupe privé" />
    </SimpleForm>
  </Create>
);

export const GroupShow = () => (
  <Show>
    <SimpleShowLayout>
      <TextField source="name" label="Nom" />
      <TextField source="description_fr" label="Description (FR)" />
      <NumberField source="member_count" label="Membres" />
      <BooleanField source="is_private" label="Privé" />
      <BooleanField source="is_active" label="Actif" />
      <DateField source="created_at" label="Créé le" showTime />
    </SimpleShowLayout>
  </Show>
);
