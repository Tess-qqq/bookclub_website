# Security Specification - Uni Book Clubs

## Data Invariants
- A book must have a title and author (strings).
- A book must belong to one of the three universities: AMU, AITU, or NU.
- The `createdAt` timestamp must be equal to the server time.
- No user registration is required, so writes are anonymous but strictly validated.

## The Dirty Dozen (Attacking the Book List)

1. **Missing Title**: `{ "author": "Homer", "uniId": "AMU", "createdAt": "server_time" }` -> REJECT
2. **Missing Author**: `{ "title": "The Odyssey", "uniId": "NU", "createdAt": "server_time" }` -> REJECT
3. **Invalid University**: `{ "title": "The Odyssey", "author": "Homer", "uniId": "MIT", "createdAt": "server_time" }` -> REJECT
4. **Huge Title**: `{ "title": "A".repeat(1001), "author": "Homer", "uniId": "AMU", "createdAt": "server_time" }` -> REJECT
5. **Huge Author**: `{ "title": "The Odyssey", "author": "A".repeat(1001), "uniId": "AMU", "createdAt": "server_time" }` -> REJECT
6. **Faked Timestamp**: `{ "title": "The Odyssey", "author": "Homer", "uniId": "AMU", "createdAt": "2000-01-01T00:00:00Z" }` -> REJECT
7. **Extra Fields**: `{ "title": "The Odyssey", "author": "Homer", "uniId": "AMU", "createdAt": "server_time", "isVerified": true }` -> REJECT
8. **Malicious ID**: Attempting to write to `/books/../../malicious` -> REJECT (Path hardening)
9. **Update Prevention**: Attempting to change the title of an existing book -> REJECT (Books should be immutable or only deletable if we had auth, but here we'll just block updates to keep it simple and 'fair').
10. **Delete Prevention**: Attempting to delete a book -> REJECT (Only admins should delete, but since we have no registration, we'll block deletes for now to prevent vandalism).
11. **Script Injection in Title**: `{ "title": "<script>alert(1)</script>", "author": "Homer", "uniId": "AMU", "createdAt": "server_time" }` -> REJECT (Strict regex check on characters or just rely on React to escape, but rules can check for suspicious patterns).
12. **Blanket Read Exposure**: Attempting to read `/users` or other non-existent paths -> REJECT (Default deny).

## Test Runner (Draft Logic)
Tests will verify that these payloads fail against the rules.
