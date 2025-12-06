import React, { useEffect } from 'react';
import { useForm } from '@mantine/form';
import { Box, Button, Group, Select, Stack, Text, TextInput, Title, Switch, PasswordInput, Autocomplete } from '@mantine/core';
import { showNotification } from '@mantine/notifications';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api-client';

interface AISettingsForm {
    enabled: boolean;
    provider: string;
    embeddingProvider: string;
    config: {
        baseUrl?: string;
        apiKey?: string;
        model?: string;
        embeddingBaseUrl?: string;
        embeddingApiKey?: string;
        embeddingModel?: string;
    };
}

export function AISettings() {
    const queryClient = useQueryClient();
    const form = useForm<AISettingsForm>({
        initialValues: {
            enabled: false,
            provider: 'ollama',
            embeddingProvider: 'same',
            config: {
                baseUrl: 'http://localhost:11434',
                model: 'llama3',
                apiKey: '',
                embeddingBaseUrl: '',
                embeddingApiKey: '',
                embeddingModel: '',
            },
        },
    });

    // Fetch current workspace to get AI settings
    const { data: workspace, isLoading } = useQuery({
        queryKey: ['workspace'],
        queryFn: async () => {
            const response = await api.post('/workspace/info');
            return response.data;
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
        if (workspace?.settings?.ai) {
            form.setValues(workspace.settings.ai);
        }
    }, [workspace]);

    const mutation = useMutation({
        mutationFn: async (values: AISettingsForm) => {
            // Use the correct workspace update endpoint
            const newSettings = {
                ...workspace?.settings,
                ai: values
            };

            await api.post('/workspace/update', { settings: newSettings });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['workspace'] });
            showNotification({
                title: 'Success',
                message: 'AI settings saved successfully',
                color: 'green',
            });
        },
        onError: (error: any) => {
            showNotification({
                title: 'Error',
                message: error?.response?.data?.message || 'Failed to save settings',
                color: 'red',
            });
        },
    });

    const handleSubmit = async (values: AISettingsForm) => {
        await mutation.mutateAsync(values);
    };

    const fetchModels = async () => {
        try {
            // Save current settings first
            await mutation.mutateAsync(form.values);
            // Then fetch models
            const result = await refetchModels();
            
            if (result.data && result.data.length > 0) {
                showNotification({
                    title: 'Success',
                    message: `Found ${result.data.length} models`,
                    color: 'green',
                });
            } else {
                showNotification({
                    title: 'Info',
                    message: 'No models found. Check your provider configuration.',
                    color: 'blue',
                });
            }
        } catch (error: any) {
            showNotification({
                title: 'Error',
                message: error?.response?.data?.message || 'Failed to fetch models',
                color: 'red',
            });
        }
    };

    if (isLoading) {
        return <Text>Loading...</Text>;
    }

    return (
        <Box>
            <Title order={3} mb="md">AI Settings</Title>
            <form onSubmit={form.onSubmit(handleSubmit)}>
                <Stack gap="md">
                    <Switch
                        label="Enable AI Features"
                        description="Enable AI-powered features like chat and embeddings"
                        {...form.getInputProps('enabled', { type: 'checkbox' })}
                    />

                    {form.values.enabled && (
                        <>
                            <Select
                                label="AI Provider"
                                placeholder="Select a provider"
                                data={[
                                    { value: 'ollama', label: 'Ollama' },
                                    { value: 'openai', label: 'OpenAI' },
                                    { value: 'anthropic', label: 'Anthropic' },
                                ]}
                                {...form.getInputProps('provider')}
                            />

                            {form.values.provider === 'ollama' && (
                                <>
                                    <TextInput
                                        label="Base URL"
                                        placeholder="http://localhost:11434"
                                        {...form.getInputProps('config.baseUrl')}
                                    />
                                    {availableModels && availableModels.length > 0 ? (
                                        <Autocomplete
                                            label="Model"
                                            placeholder="Select or type a model"
                                            data={availableModels}
                                            {...form.getInputProps('config.model')}
                                        />
                                    ) : (
                                        <TextInput
                                            label="Model"
                                            placeholder="llama3"
                                            description="Click 'Fetch Models' to load available models"
                                            {...form.getInputProps('config.model')}
                                        />
                                    )}
                                </>
                            )}

                            {form.values.provider === 'openai' && (
                                <>
                                    <PasswordInput
                                        label="API Key"
                                        placeholder="sk-..."
                                        {...form.getInputProps('config.apiKey')}
                                    />
                                    {availableModels && availableModels.length > 0 ? (
                                        <Autocomplete
                                            label="Model"
                                            placeholder="Select or type a model"
                                            data={availableModels}
                                            {...form.getInputProps('config.model')}
                                        />
                                    ) : (
                                        <TextInput
                                            label="Model"
                                            placeholder="gpt-4"
                                            description="Click 'Fetch Models' to load available models"
                                            {...form.getInputProps('config.model')}
                                        />
                                    )}
                                </>
                            )}

                            {form.values.provider === 'anthropic' && (
                                <>
                                    <PasswordInput
                                        label="API Key"
                                        placeholder="sk-ant-..."
                                        {...form.getInputProps('config.apiKey')}
                                    />
                                    {availableModels && availableModels.length > 0 ? (
                                        <Autocomplete
                                            label="Model"
                                            placeholder="Select or type a model"
                                            data={availableModels}
                                            {...form.getInputProps('config.model')}
                                        />
                                    ) : (
                                        <TextInput
                                            label="Model"
                                            placeholder="claude-3-opus-20240229"
                                            description="Click 'Fetch Models' to load available models"
                                            {...form.getInputProps('config.model')}
                                        />
                                    )}
                                </>
                            )}

                            <Select
                                label="Embedding Provider"
                                description="Provider for document embeddings and semantic search"
                                data={[
                                    { value: 'same', label: 'Same as AI Provider' },
                                    { value: 'openai', label: 'OpenAI' },
                                    { value: 'ollama', label: 'Ollama' },
                                ]}
                                {...form.getInputProps('embeddingProvider')}
                            />

                            {form.values.embeddingProvider !== 'same' && (
                                <>
                                    {form.values.embeddingProvider === 'ollama' && (
                                        <>
                                            <TextInput
                                                label="Embedding Base URL"
                                                placeholder="http://localhost:11434"
                                                {...form.getInputProps('config.embeddingBaseUrl')}
                                            />
                                            <TextInput
                                                label="Embedding Model"
                                                placeholder="nomic-embed-text"
                                                {...form.getInputProps('config.embeddingModel')}
                                            />
                                        </>
                                    )}

                                    {form.values.embeddingProvider === 'openai' && (
                                        <>
                                            <PasswordInput
                                                label="Embedding API Key"
                                                placeholder="sk-..."
                                                {...form.getInputProps('config.embeddingApiKey')}
                                            />
                                            <TextInput
                                                label="Embedding Model"
                                                placeholder="text-embedding-ada-002"
                                                {...form.getInputProps('config.embeddingModel')}
                                            />
                                        </>
                                    )}
                                </>
                            )}
                        </>
                    )}

                    <Group justify="flex-start" mt="md">
                        <Button type="submit" loading={mutation.isPending}>
                            Save Changes
                        </Button>
                        {form.values.enabled && (
                            <Button
                                variant="light"
                                onClick={fetchModels}
                                loading={isFetchingModels || mutation.isPending}
                            >
                                Fetch Models
                            </Button>
                        )}
                    </Group>
                </Stack>
            </form>
        </Box>
    );
}
