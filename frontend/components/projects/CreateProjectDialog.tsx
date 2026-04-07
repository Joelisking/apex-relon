'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Loader2 } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { ProjectCostSegments } from './ProjectCostSegments';
import { ProjectLocationSection } from './ProjectLocationSection';
import { ProjectTeamMembersSection } from './ProjectTeamMembersSection';
import { ProjectCoreFields } from './ProjectCoreFields';
import { useCreateProjectForm } from '@/hooks/useCreateProjectForm';

interface CreateProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onProjectCreated: () => void;
  currentUserId?: string;
  initialClientId?: string;
}

export function CreateProjectDialog({
  open,
  onOpenChange,
  onProjectCreated,
  initialClientId,
}: CreateProjectDialogProps) {
  const {
    form, loading, isLoadingStages,
    clients, leads, users,
    projectStages, primaryServiceTypeName,
    riskOptions, setRiskOptions,
    countyOptions, setCountyOptions,
    serviceCategories,
    selectedCategoryIds, selectedServiceTypeIds,
    costSegments, setCostSegments,
    activeOptionalStages, setActiveOptionalStages,
    linkedServiceItems, filteredServiceItems,
    serviceItemPickerValue, setServiceItemPickerValue,
    addServiceItem, removeServiceItem,
    teamMembers, availableUsers, addTeamMember, removeTeamMember,
    toggleCategory, toggleServiceType,
    handleClientChange, handleUseSegmentTotal, handleGeocode,
    watchedContractedValue, onSubmit,
  } = useCreateProjectForm({ open, onOpenChange, onProjectCreated, initialClientId });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {initialClientId
              ? `Create Project for ${clients.find((c) => c.id === initialClientId)?.name ?? clients.find((c) => c.id === initialClientId)?.individualName ?? 'Customer'}`
              : 'Create New Project'}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">

            <FormField
              control={form.control}
              name="isIndot"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>INDOT Project?</FormLabel>
                  <FormControl>
                    <RadioGroup
                      value={field.value ? 'yes' : 'no'}
                      onValueChange={(val) => field.onChange(val === 'yes')}
                      className="flex gap-6">
                      <div className="flex items-center gap-2">
                        <RadioGroupItem value="yes" id="indot-yes" />
                        <Label htmlFor="indot-yes">Yes</Label>
                      </div>
                      <div className="flex items-center gap-2">
                        <RadioGroupItem value="no" id="indot-no" />
                        <Label htmlFor="indot-no">No</Label>
                      </div>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <ProjectCoreFields
                clients={clients}
                leads={leads}
                users={users}
                onClientChange={handleClientChange}
                hideClient={!!initialClientId}
                projectStages={projectStages}
                primaryServiceTypeName={primaryServiceTypeName}
                isLoadingStages={isLoadingStages}
                activeOptionalStages={activeOptionalStages}
                onOptionalStageChange={setActiveOptionalStages}
                stageIdPrefix="create"
                serviceCategories={serviceCategories}
                selectedCategoryIds={selectedCategoryIds}
                selectedServiceTypeIds={selectedServiceTypeIds}
                onCategoryToggle={toggleCategory}
                onServiceTypeToggle={toggleServiceType}
                linkedServiceItems={linkedServiceItems}
                availableServiceItems={filteredServiceItems.map((si) => ({ id: si.id, name: si.name, unit: si.unit }))}
                serviceItemPickerValue={serviceItemPickerValue}
                onAddServiceItem={addServiceItem}
                onRemoveServiceItem={removeServiceItem}
                onServiceItemPickerChange={setServiceItemPickerValue}
                riskOptions={riskOptions}
                onRiskOptionsChange={setRiskOptions}
                countyOptions={countyOptions}
                onCountyOptionsChange={setCountyOptions}
                endOfProjectValueDefault={0}
              />
            </div>

            <ProjectCostSegments
              value={costSegments}
              onChange={setCostSegments}
              contractedValue={Number(watchedContractedValue) || 0}
              onUseSegmentTotal={handleUseSegmentTotal}
            />

            <ProjectLocationSection onGeocode={handleGeocode} />

            <ProjectTeamMembersSection
              members={teamMembers}
              availableUsers={availableUsers}
              onAdd={addTeamMember}
              onRemove={removeTeamMember}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create Project
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
