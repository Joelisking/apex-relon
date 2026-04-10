'use client';

import { useState } from 'react';
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
import { Loader2, MapPin } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
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
    projectStages, primaryJobTypeName,
    riskOptions, setRiskOptions,
    countyOptions, setCountyOptions,
    divisions,
    selectedDivisionIds, selectedJobTypeIds,
    activeOptionalStages, setActiveOptionalStages,
    teamMembers, availableUsers, addTeamMember, removeTeamMember,
    toggleDivision, toggleJobType,
    handleClientChange, handleGeocode,
    onSubmit,
  } = useCreateProjectForm({ open, onOpenChange, onProjectCreated, initialClientId });

  const [useClientAddress, setUseClientAddress] = useState(false);

  const watchedClientId = form.watch('clientId');
  const selectedClient = clients.find((c) => c.id === watchedClientId);
  const clientAddress = selectedClient?.address ?? null;

  function handleClientChangeWithReset(clientId: string) {
    setUseClientAddress(false);
    form.setValue('address', '');
    handleClientChange(clientId);
  }

  function handleUseClientAddress(checked: boolean) {
    setUseClientAddress(checked);
    form.setValue('address', checked && clientAddress ? clientAddress : '');
    if (!checked) {
      form.setValue('latitude', null);
      form.setValue('longitude', null);
      handleGeocode(null, null);
    }
  }

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
                onClientChange={handleClientChangeWithReset}
                hideClient={!!initialClientId}
                projectStages={projectStages}
                primaryJobTypeName={primaryJobTypeName}
                isLoadingStages={isLoadingStages}
                activeOptionalStages={activeOptionalStages}
                onOptionalStageChange={setActiveOptionalStages}
                stageIdPrefix="create"
                divisions={divisions}
                selectedDivisionIds={selectedDivisionIds}
                selectedJobTypeIds={selectedJobTypeIds}
                onDivisionToggle={toggleDivision}
                onJobTypeToggle={toggleJobType}
                riskOptions={riskOptions}
                onRiskOptionsChange={setRiskOptions}
                countyOptions={countyOptions}
                onCountyOptionsChange={setCountyOptions}
                endOfProjectValueDefault={0}
              />
            </div>

            <div className="space-y-2">
              {clientAddress && (
                <label className="flex items-center gap-1.5 cursor-pointer select-none w-fit">
                  <Checkbox
                    checked={useClientAddress}
                    onCheckedChange={(checked) => handleUseClientAddress(!!checked)}
                  />
                  <span className="text-xs text-muted-foreground">Same as client address</span>
                </label>
              )}
              {useClientAddress && clientAddress ? (
                <div className="space-y-3">
                  <p className="text-sm font-medium">Location</p>
                  <div className="flex items-center gap-2 h-9 px-3 rounded-md border border-input bg-muted/40 text-sm text-muted-foreground">
                    <MapPin className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">{clientAddress}</span>
                  </div>
                </div>
              ) : (
                <ProjectLocationSection onGeocode={handleGeocode} />
              )}
            </div>

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
