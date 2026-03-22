import type { ReactNode } from 'react';
import type { Character } from '@shared/character';
import type { Location } from '@shared/location';
import type { TemporalDetailStatus } from '@shared/temporal';
import type { LocationFormState } from '@renderer/lib/forms';
import type { WorkspaceMode } from '@renderer/lib/topBar';
import { LocationEditor } from './LocationEditor';
import { LocationList } from './LocationList';

type LocationWorkspaceProps = {
  activeForm: LocationFormState;
  changedLocationIds: ReadonlySet<number>;
  characters: Character[];
  isLoadingLocationDetails: boolean;
  isLoadingLocations: boolean;
  isSavingLocation: boolean;
  linkedItemCount: number;
  linksSlot?: ReactNode;
  locations: Location[];
  mode: WorkspaceMode;
  onFormChange: (changes: Partial<LocationFormState>) => void;
  onSelectLocation: (id: number) => void;
  onSubmit: () => void | Promise<void>;
  selectedLocation: Location | null;
  selectedLocationCharacterCount: number;
  selectedLocationId: number | null;
  selectedLocationStatus: TemporalDetailStatus;
  tick: number;
};

export function LocationWorkspace({
  activeForm,
  changedLocationIds,
  characters,
  isLoadingLocationDetails,
  isLoadingLocations,
  isSavingLocation,
  linkedItemCount,
  linksSlot,
  locations,
  mode,
  onFormChange,
  onSelectLocation,
  onSubmit,
  selectedLocation,
  selectedLocationCharacterCount,
  selectedLocationId,
  selectedLocationStatus,
  tick,
}: LocationWorkspaceProps) {
  return (
    <main className="content-grid">
      <LocationList
        characters={characters}
        changedLocationIds={changedLocationIds}
        isLoading={isLoadingLocations}
        locations={locations}
        onSelectLocation={onSelectLocation}
        selectedLocationId={selectedLocationId}
      />

      <LocationEditor
        form={activeForm}
        isLoading={isLoadingLocationDetails}
        isSubmitting={isSavingLocation}
        linkedCharacterCount={selectedLocationCharacterCount}
        linkedItemCount={linkedItemCount}
        linksSlot={linksSlot}
        location={selectedLocation}
        mode={mode}
        onFormChange={onFormChange}
        onSubmit={onSubmit}
        selectedLocationId={selectedLocationId}
        selectedLocationStatus={selectedLocationStatus}
        tick={tick}
      />
    </main>
  );
}
