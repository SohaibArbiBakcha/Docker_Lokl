import {
  List, Datagrid, TextField, BooleanField, DateField, NumberField,
  Edit, SimpleForm, TextInput, BooleanInput, SelectInput, DateTimeInput, NumberInput,
  Create, Show, SimpleShowLayout, SearchInput,
  ReferenceInput, required,
} from 'react-admin';

const typeChoices = [
  { id: 'in_person', name: 'Présentiel' },
  { id: 'online', name: 'En ligne' },
  { id: 'hybrid', name: 'Hybride' },
];

const eventFilters = [
  <SearchInput source="q" alwaysOn key="q" />,
  <SelectInput source="type" choices={typeChoices} key="type" />,
];

export const EventList = () => (
  <List filters={eventFilters} sort={{ field: 'start_at', order: 'DESC' }}>
    <Datagrid rowClick="edit" bulkActionButtons={false}>
      <TextField source="title" label="Titre" />
      <TextField source="type" label="Type" />
      <DateField source="start_at" label="Début" showTime />
      <NumberField source="capacity" label="Capacité" />
      <NumberField source="registered_count" label="Inscrits" />
      <BooleanField source="is_free" label="Gratuit" />
      <BooleanField source="is_promoted" label="Sponsorisé" />
      <BooleanField source="is_cancelled" label="Annulé" />
    </Datagrid>
  </List>
);

export const EventEdit = () => (
  <Edit>
    <SimpleForm>
      <TextInput source="title" label="Titre" fullWidth />
      <TextInput source="description_fr" label="Description (FR)" multiline fullWidth />
      <TextInput source="description_ar" label="Description (AR)" multiline fullWidth />
      <SelectInput source="type" choices={typeChoices} />
      <DateTimeInput source="start_at" label="Début" />
      <DateTimeInput source="end_at" label="Fin" />
      <NumberInput source="capacity" label="Capacité" />
      <TextInput source="location" label="Lieu" fullWidth />
      <BooleanInput source="is_free" label="Gratuit" />
      <BooleanInput source="is_promoted" label="Sponsorisé (épinglé en haut du fil)" />
      <BooleanInput source="is_active" label="Actif" />
      <BooleanInput source="is_cancelled" label="Annulé" />
    </SimpleForm>
  </Edit>
);

export const EventCreate = () => (
  <Create>
    <SimpleForm>
      <TextInput source="title" label="Titre" fullWidth validate={required()} />
      <TextInput source="description_fr" label="Description (FR)" multiline fullWidth />
      <ReferenceInput source="group_id" reference="groups">
        <SelectInput
          label="Groupe organisateur (optionnel — créé automatiquement sinon)"
          optionText="name"
        />
      </ReferenceInput>
      <ReferenceInput source="city_id" reference="cities">
        <SelectInput label="Ville" optionText="name_fr" validate={required()} />
      </ReferenceInput>
      <ReferenceInput source="category_id" reference="categories">
        <SelectInput label="Catégorie" optionText="name_fr" validate={required()} />
      </ReferenceInput>
      <SelectInput source="type" choices={typeChoices} defaultValue="in_person" />
      <DateTimeInput source="start_at" label="Début" validate={required()} />
      <DateTimeInput source="end_at" label="Fin" validate={required()} />
      <NumberInput source="capacity" label="Capacité" defaultValue={50} />
      <TextInput source="location" label="Lieu" fullWidth />
      <BooleanInput source="is_free" label="Gratuit" defaultValue={true} />
    </SimpleForm>
  </Create>
);

export const EventShow = () => (
  <Show>
    <SimpleShowLayout>
      <TextField source="title" label="Titre" />
      <TextField source="type" label="Type" />
      <DateField source="start_at" label="Début" showTime />
      <DateField source="end_at" label="Fin" showTime />
      <NumberField source="capacity" label="Capacité" />
      <NumberField source="registered_count" label="Inscrits" />
      <BooleanField source="is_free" label="Gratuit" />
      <BooleanField source="is_cancelled" label="Annulé" />
    </SimpleShowLayout>
  </Show>
);
