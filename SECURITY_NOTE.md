# SECURITY NOTE

Changing an existing repository from private to public can expose old commits and history.

Important points:

1. Deleting a secret in a later commit is not enough.
2. If a secret existed in any previous commit, treat it as compromised and rotate it.
3. History may still contain private artifacts even if the current working tree is clean.
4. The safest public release approach is:
   - export a clean snapshot
   - create a brand-new repository
   - publish with a single fresh initial commit

Use history rewrite only when you fully understand force-push impact and collaborator re-clone requirements.
