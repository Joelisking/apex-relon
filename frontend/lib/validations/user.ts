import { z } from 'zod';

export const createUserSchema = z
  .object({
    email: z.string().email('Invalid email address'),
    name: z.string().min(2, 'Name must be at least 2 characters'),
    role: z.string().min(1, 'Please select a role'),
    teamId: z.string().optional(),
    managerId: z.string().optional(),
  })
  .refine(
    (data) => {
      // Require teamId for BDM and SALES
      if (['BDM', 'SALES'].includes(data.role)) {
        return !!data.teamId;
      }
      return true;
    },
    {
      message: 'Team is required for BDM and Sales users',
      path: ['teamId'],
    }
  );

export type CreateUserFormData = z.infer<typeof createUserSchema>;

export const updateUserSchema = z.object({
  email: z.string().email('Invalid email address').optional(),
  name: z
    .string()
    .min(2, 'Name must be at least 2 characters')
    .optional(),
  role: z.string().optional(),
  teamId: z.string().optional(),
  managerId: z.string().optional(),
});

export type UpdateUserFormData = z.infer<typeof updateUserSchema>;
