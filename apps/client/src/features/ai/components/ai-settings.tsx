import React, { useEffect } from 'react';
import { useForm } from '@mantine/form';
import { Box, Button, Group, Select, Stack, Text, TextInput, Title, Switch, PasswordInput, Autocomplete } from '@mantine/core';
import { showNotification } from '@mantine/notifications';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api-client';

interface AISettingsForm {
    enabled: boolean;
    provider: string;
    config: {
        baseUrl?: string;
        apiKey?: string;
        model?: string;
    };
}

export function AISettings() {
    const queryClient = useQueryClient();
    const form = useForm<AISettingsForm>({
        initialValues: {
            enabled: false,
            provider: 'ollama',
            config: {
                baseUrl: 'http://localhost:11434',
                model: 'llama3',
                apiKey: '',
            },
        },
    });

    const { data: settings, isLoading } = useQuery({
        queryKey: ['workspace-settings', 'ai'],
        queryFn: async () => {
            // Fetch workspace settings. Assuming there's an endpoint or we use the general workspace settings endpoint
            // For now, let's assume we fetch the workspace and extract settings.
            // Actually, the plan said we store it in workspace.settings.
            // We probably need a dedicated endpoint or use the existing workspace update one.
            // Let's assume we have a way to get current workspace settings.
            const response = await api.get('/workspaces/current');
            return response.data.settings?.ai || null;
        },
    });

    const { data: availableModels, refetch: refetchModels, isFetching: isFetchingModels } = useQuery({
        queryKey: ['ai-models'],
        queryFn: async () => {
            const response = await api.post('/ai/models');
            return response.data;
        },
        enabled: false, // Only fetch on demand
    });

    useEffect(() => {
        if (settings) {
            form.setValues(settings);
        }
    }, [settings]);

    const mutation = useMutation({
        mutationFn: async (values: AISettingsForm) => {
            // We need to update the workspace settings.
            // This usually involves patching the workspace.
            const currentWorkspace = queryClient.getQueryData<any>(['workspaces', 'current']);
            const newSettings = {
                ...currentWorkspace?.settings,
                ai: values
            };

            await api.patch('/workspaces/current', { settings: newSettings });
        },
        onSuccess: () => {
            showNotification({
                title: 'Settings saved',
                message: 'AI settings have been updated successfully.',
                color: 'green',
            });
            queryClient.invalidateQueries({ queryKey: ['workspaces', 'current'] });
        },
        onError: () => {
            showNotification({
                title: 'Error',
                message: 'Failed to save settings.',
                color: 'red',
            });
        },
    });

    const handleSubmit = (values: AISettingsForm) => {
        mutation.mutate(values);
    };

    if (isLoading) return <Text>Loading settings...</Text>;

    return (
        <Box maw={600}>
            <Title order={3} mb="lg">AI Integration Settings</Title>
            <form onSubmit={form.onSubmit(handleSubmit)}>
                <Stack gap="md">
                    <Switch
                        label="Enable AI Features"
                        {...form.getInputProps('enabled', { type: 'checkbox' })}
                    />

                    <Select
                        label="AI Provider"
                        data={[
                            { value: 'ollama', label: 'Ollama (Local)' },
                            { value: 'anthropic', label: 'Anthropic (Claude)' },
                            { value: 'openai', label: 'OpenAI / Compatible' },
                        ]}
                        {...form.getInputProps('provider')}
                        disabled={!form.values.enabled}
                    />

                    {form.values.provider === 'ollama' && (
                        <>
                            <TextInput
                                label="Base URL"
                                description="URL where Ollama is running (e.g., http://localhost:11434)"
                                {...form.getInputProps('config.baseUrl')}
                                disabled={!form.values.enabled}
                            />
                            <Autocomplete
                                label="Model Name"
                                placeholder="llama3"
                                data={availableModels || []}
                                {...form.getInputProps('config.model')}
                                disabled={!form.values.enabled}
                            />
                        </>
                    )}

                    {form.values.provider === 'anthropic' && (
                        <>
                            <PasswordInput
                                label="API Key"
                                placeholder="sk-ant-..."
                                {...form.getInputProps('config.apiKey')}
                                disabled={!form.values.enabled}
                            />
                            <Autocomplete
                                label="Model Name"
                                placeholder="claude-3-5-sonnet-20240620"
                                data={availableModels || []}
                                {...form.getInputProps('config.model')}
                                disabled={!form.values.enabled}
                            />
                        </>
                    )}

                    {form.values.provider === 'openai' && (
                        <>
                            <TextInput
                                label="Base URL"
                                description="Optional. Leave empty for default OpenAI."
                                placeholder="https://api.openai.com/v1"
                                {...form.getInputProps('config.baseUrl')}
                                disabled={!form.values.enabled}
                            />
                            <PasswordInput
                                label="API Key"
                                placeholder="sk-..."
                                {...form.getInputProps('config.apiKey')}
                                disabled={!form.values.enabled}
                            />
                            <Autocomplete
                                label="Model Name"
                                placeholder="gpt-4o"
                                data={availableModels || []}
                                {...form.getInputProps('config.model')}
                                disabled={!form.values.enabled}
                            />
                        </>
                    )}

                    <Group justify="flex-end" mt="md">
                        <Button variant="default" onClick={() => fetchModels()} loading={isFetchingModels}>
                            Fetch Models
                        </Button>
                        <Button type="submit" loading={mutation.isPending}>
                            Save Changes
                        </Button>
                    </Group>
                </Stack>
            </form>
        </Box>
    );

    async function fetchModels() {
        // We need to save the config first temporarily or pass it to the backend to test connection/fetch models
        // But the backend uses the stored config. 
        // So we should probably save first, then fetch.
        // Or we can have an endpoint that accepts config and returns models (better for testing).
        // For now, let's assume we save first.
        await mutation.mutateAsync(form.values);
        refetchModels();
    }
}
