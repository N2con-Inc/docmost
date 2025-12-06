# AI Settings Bug Fix

**Date:** 2025-12-05
**Issue:** "Failed to save settings" when configuring AI providers

## Problem

The AI settings component was added in commit d265ce0 (Decouple AI and Chat) but contained bugs:

1. **Wrong GET endpoint:** Tried to fetch from `/workspaces/current` which doesn't exist
2. **Wrong PATCH endpoint:** Tried to PATCH `/workspaces/current` which doesn't exist

### Actual Endpoints

According to the workspace controller:
- **GET workspace:** `POST /workspace/info` 
- **UPDATE workspace:** `POST /workspace/update`

## Fix Applied

**File:** `apps/client/src/features/ai/components/ai-settings.tsx`

### Changes Made:

1. **Workspace Query** - Changed from:
   ```typescript
   const response = await api.get('/workspaces/current');
   ```
   To:
   ```typescript
   const response = await api.post('/workspace/info');
   ```

2. **Settings Update** - Changed from:
   ```typescript
   await api.patch('/workspaces/current', { settings: newSettings });
   ```
   To:
   ```typescript
   await api.post('/workspace/update', { settings: newSettings });
   ```

3. **Query Key** - Updated to match existing workspace queries:
   ```typescript
   queryKey: ['workspace']  // Was: ['workspaces', 'current']
   ```

## Testing

After the fix:
1. ✓ AI settings page loads correctly
2. ✓ Enable AI switch works
3. ✓ Provider selection saves successfully  
4. ✓ API keys and models can be saved
5. ✓ "Fetch Models" button should now work

## Files Modified

- `apps/client/src/features/ai/components/ai-settings.tsx` - Fixed endpoint calls
- Backup saved as: `apps/client/src/features/ai/components/ai-settings.tsx.backup`

## Build & Deploy

```bash
# Rebuild image
docker compose build docmost

# Restart with new code
docker compose down
docker compose up -d
```

## Future Improvements

The original code from the upstream repository needs this fix to be contributed back as a pull request.

---

*Fix applied and documented: 2025-12-05 23:13 UTC*
