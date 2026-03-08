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
  isLoadingLocationDetails: boolean;
  isLoadingLocations: boolean;
  isUpdatingLocation: boolean;
  locations: Location[];
  onCreateLocation: (event: FormEvent<HTMLFormElement>) => void | Promise<void>;
  onCreateLocationFormChange: (changes: Partial<LocationFormState>) => void;
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
  isLoadingLocationDetails,
  isLoadingLocations,
  isUpdatingLocation,
  locations,
  onCreateLocation,
  onCreateLocationFormChange,
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
        isLoading={isLoadingLocationDetails}
        isSubmitting={isUpdatingLocation}
        linkedCharacterCount={selectedLocationCharacterCount}
        location={selectedLocation}
        mode="edit"
        onFormChange={onEditLocationFormChange}
        onSubmit={onUpdateLocation}
        selectedLocationId={selectedLocationId}
      />

      <LocationEditor
        form={createLocationForm}
        isSubmitting={isCreatingLocation}
        linkedCharacterCount={0}
        location={null}
        mode="create"
        onFormChange={onCreateLocationFormChange}
        onSubmit={onCreateLocation}
        selectedLocationId={selectedLocationId}
      />
    </main>
  );
}
