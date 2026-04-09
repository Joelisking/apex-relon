'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, FolderOpen } from 'lucide-react';
import { ProjectCostSegments } from './ProjectCostSegments';
import { ProjectLocationSection } from './ProjectLocationSection';
import { ProjectTeamMembersSection } from './ProjectTeamMembersSection';
import { ProjectCoreFields } from './ProjectCoreFields';
import { useEditProjectForm } from '@/hooks/useEditProjectForm';
import type { Project } from '@/lib/api/projects-client';

interface EditProjectDialogProps {
  project: Project;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onProjectUpdated: (updated: Project) => void;
}

export function EditProjectDialog({
  project,
  open,
  onOpenChange,
  onProjectUpdated,
}: EditProjectDialogProps) {
  const {
    form, loading,
    clients, leads, users,
    projectStages, primaryServiceTypeName,
    riskOptions, setRiskOptions,
    countyOptions, setCountyOptions,
    serviceCategories,
    selectedCategoryIds, selectedServiceTypeIds,
    costSegments, setCostSegments,
    activeOptionalStages, setActiveOptionalStages,
    linkedServiceItems, filteredServiceItems,
    addServiceItem, removeServiceItem,
    teamMembers, availableUsers, addTeamMember, removeTeamMember,
    toggleCategory, toggleServiceType,
    handleUseSegmentTotal, handleGeocode,
    watchedContractedValue, onSubmit,
  } = useEditProjectForm({ project, open, onOpenChange, onProjectUpdated });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Project</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <ProjectCoreFields
                clients={clients}
                leads={leads}
                users={users}
                projectStages={projectStages}
                primaryServiceTypeName={primaryServiceTypeName}
                activeOptionalStages={activeOptionalStages}
                onOptionalStageChange={setActiveOptionalStages}
                stageIdPrefix="edit"
                statusLabel="Status"
                serviceCategories={serviceCategories}
                selectedCategoryIds={selectedCategoryIds}
                selectedServiceTypeIds={selectedServiceTypeIds}
                onCategoryToggle={toggleCategory}
                onServiceTypeToggle={toggleServiceType}
                linkedServiceItems={linkedServiceItems}
                availableServiceItems={filteredServiceItems.map((si) => ({ id: si.id, name: si.name, unit: si.unit }))}
                onAddServiceItem={addServiceItem}
                onRemoveServiceItem={removeServiceItem}
                riskOptions={riskOptions}
                onRiskOptionsChange={setRiskOptions}
                countyOptions={countyOptions}
                onCountyOptionsChange={setCountyOptions}
              />
            </div>

            <ProjectCostSegments
              value={costSegments}
              onChange={setCostSegments}
              contractedValue={Number(watchedContractedValue) || 0}
              onUseSegmentTotal={handleUseSegmentTotal}
            />

            <FormField
              control={form.control}
              name="statusNote"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Status Note</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Why is this project on hold, cancelled, or otherwise needs context?"
                      rows={2}
                      className="resize-none"
                      {...field}
                      value={field.value ?? ''}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <ProjectLocationSection onGeocode={handleGeocode} />

            <FormField
              control={form.control}
              name="folderPath"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-1.5">
                    <FolderOpen className="h-3.5 w-3.5" />
                    Server Folder Path
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder="P:\2026\Allen\Large Jobs\26020044 - Project Name"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

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
                Save Changes
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
