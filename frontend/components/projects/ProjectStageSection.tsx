'use client';

import { useFormContext } from 'react-hook-form';
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import type { PipelineStage } from '@/lib/api/pipeline-client';

interface ProjectStageSectionProps {
  projectStages: PipelineStage[];
  primaryJobTypeName?: string;
  isLoadingStages?: boolean;
  activeOptionalStages: string[];
  onOptionalStageChange: (stages: string[]) => void;
  /** Unique prefix for optional-stage checkbox IDs to avoid DOM conflicts */
  idPrefix: string;
  statusLabel?: string;
}

export function ProjectStageSection({
  projectStages,
  primaryJobTypeName,
  isLoadingStages = false,
  activeOptionalStages,
  onOptionalStageChange,
  idPrefix,
  statusLabel = 'Stage',
}: ProjectStageSectionProps) {
  const form = useFormContext();
  const optionalStages = projectStages.filter((s) => s.isOptional);

  return (
    <>
      <FormField
        control={form.control}
        name="status"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{statusLabel}</FormLabel>
            <Select
              onValueChange={field.onChange}
              value={field.value}
              disabled={isLoadingStages}>
              <FormControl>
                <SelectTrigger>
                  <SelectValue
                    placeholder={isLoadingStages ? 'Loading stages…' : 'Select stage'}
                  />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {primaryJobTypeName ? (
                  <>
                    <SelectGroup>
                      <SelectLabel>General</SelectLabel>
                      {projectStages
                        .filter((s) => s.jobType === '__all__')
                        .map((s) => (
                          <SelectItem key={s.id} value={s.name}>
                            {s.name}
                          </SelectItem>
                        ))}
                    </SelectGroup>
                    {projectStages.some((s) => s.jobType !== '__all__') && (
                      <SelectGroup>
                        <SelectLabel>{primaryJobTypeName}</SelectLabel>
                        {projectStages
                          .filter((s) => s.jobType !== '__all__')
                          .map((s) => (
                            <SelectItem key={s.id} value={s.name}>
                              {s.name}
                            </SelectItem>
                          ))}
                      </SelectGroup>
                    )}
                  </>
                ) : (
                  projectStages.map((s) => (
                    <SelectItem key={s.id} value={s.name}>
                      {s.name}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />

      {optionalStages.length > 0 && (
        <div className="col-span-2 space-y-2 rounded-lg border border-border/60 bg-muted/30 p-3">
          <p className="text-sm font-medium">Optional stages</p>
          <p className="text-xs text-muted-foreground">
            Check the stages that will occur for this project
          </p>
          <div className="flex flex-wrap gap-x-6 gap-y-2 pt-0.5">
            {optionalStages.map((stage) => (
              <div key={stage.name} className="flex items-center gap-2">
                <Checkbox
                  id={`opt-${idPrefix}-${stage.name}`}
                  checked={activeOptionalStages.includes(stage.name)}
                  onCheckedChange={(checked) =>
                    onOptionalStageChange(
                      checked
                        ? [...activeOptionalStages, stage.name]
                        : activeOptionalStages.filter((s) => s !== stage.name),
                    )
                  }
                />
                <Label
                  htmlFor={`opt-${idPrefix}-${stage.name}`}
                  className="font-normal text-sm cursor-pointer">
                  {stage.name}
                </Label>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
