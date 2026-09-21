/**
 * Signed-in account shown in the admin shell. Provided by the auth module through props,
 * so shared layouts stay independent of business modules.
 */
export interface AdminAccount {
  name: string;
  email: string;
  roleLabel: string;
}
