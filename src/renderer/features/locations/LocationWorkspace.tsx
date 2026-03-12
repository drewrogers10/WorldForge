import type { FormEvent } from 'react';
import type { Character } from '@shared/character';
import type { Location } from '@shared/location';
import type { LocationFormState } from '@renderer/lib/forms';
import { LocationEditor } from './LocationEditor';
import { LocationList } from './LocationList';

type LocationWorkspaceProps = {
  characters: Character[];
  createLocationForm: LocationFormState;
  editLocationForm: LocationFormState;
  isCreatingLocation: boolean;
  isDeletingLocation: boolean;
  isLoadingLocationDetails: boolean;
  isLoadingLocations: boolean;
  isUpdatingLocation: boolean;
  linkedItemCount: number;
  locations: Location[];
  onCreateLocation: (event: FormEvent<HTMLFormElement>) => void | Promise<void>;
  onCreateLocationFormChange: (changes: Partial<LocationFormState>) => void;
  onDeleteLocation: () => void | Promise<void>;
  onEditLocationFormChange: (changes: Partial<LocationFormState>) => void;
  onSelectLocation: (id: number) => void;
  onUpdateLocation: (event: FormEvent<HTMLFormElement>) => void | Promise<void>;
  selectedLocation: Location | null;
  selectedLocationCharacterCount: number;
  selectedLocationId: number | null;
};

export function LocationWorkspace({
  characters,
  createLocationForm,
  editLocationForm,
  isCreatingLocation,
  isDeletingLocation,
  isLoadingLocationDetails,
  isLoadingLocations,
  isUpdatingLocation,
  linkedItemCount,
  locations,
  onCreateLocation,
  onCreateLocationFormChange,
  onDeleteLocation,
  onEditLocationFormChange,
  onSelectLocation,
  onUpdateLocation,
  selectedLocation,
  selectedLocationCharacterCount,
  selectedLocationId,
}: LocationWorkspaceProps) {
  return (
    <main className="content-grid">
      <LocationList
        characters={characters}
        isLoading={isLoadingLocations}
        locations={locations}
        onSelectLocation={onSelectLocation}
        selectedLocationId={selectedLocationId}
      />

      <LocationEditor
        form={editLocationForm}
        isDeleting={isDeletingLocation}
        isLoading={isLoadingLocationDetails}
        isSubmitting={isUpdatingLocation}
        linkedCharacterCount={selectedLocationCharacterCount}
        linkedItemCount={linkedItemCount}
        location={selectedLocation}
        mode="edit"
        onDelete={onDeleteLocation}
        onFormChange={onEditLocationFormChange}
        onSubmit={onUpdateLocation}
        selectedLocationId={selectedLocationId}
      />

      <LocationEditor
        form={createLocationForm}
        isSubmitting={isCreatingLocation}
        linkedCharacterCount={0}
        linkedItemCount={0}
        location={null}
        mode="create"
        onFormChange={onCreateLocationFormChange}
        onSubmit={onCreateLocation}
        selectedLocationId={selectedLocationId}
      />
    </main>
  );
}
