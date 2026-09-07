-- Lets an allowlisted logged-in user flag a scenario-analyzer result as
-- looking wrong directly from the app, instead of the only correction path
-- being "notice it in conversation, ask Claude to manually re-audit the
-- corpus". Deliberately narrow: users can only INSERT a fixed-shape row
-- (issue_type='user_flagged_result', severity='warning', resolved=false)
-- -- they can never mark an issue resolved, escalate its severity, or write
-- any other issue_type. Resolving/triaging stays an admin/service-role
-- action, same as every other validation_issues row today.
create policy validation_issues_insert_user_flag
on validation_issues
for insert
to public
with check (
  is_allowed_user()
  and resolved = false
  and issue_type = 'user_flagged_result'
  and severity = 'warning'
);
