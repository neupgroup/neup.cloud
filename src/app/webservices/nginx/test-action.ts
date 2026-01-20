'use server';

import { executeCommand } from '@/app/commands/actions';
import Cookies from 'universal-cookie';

export async function testNginxConfiguration() {
    try {
        const cookies = new Cookies(null, { path: '/' });
        const serverId = cookies.get('selected_server');

        if (!serverId) {
            return {
                success: false,
                error: 'No server selected'
            };
        }

        // Test nginx configuration
        const result = await executeCommand(serverId, 'sudo nginx -t');

        // executeCommand returns { output, error }
        // nginx -t outputs to stderr even on success
        const output = result.output || '';
        const hasError = result.error;

        // Check if the test was successful
        // nginx -t outputs success messages to stderr, so we check the output content
        if (output.includes('syntax is ok') && output.includes('test is successful')) {
            return {
                success: true,
                message: 'Configuration test passed successfully',
                output: output
            };
        } else if (output.includes('syntax is ok')) {
            return {
                success: true,
                message: 'Configuration syntax is valid',
                output: output
            };
        } else if (hasError) {
            return {
                success: false,
                error: hasError,
                output: output
            };
        } else {
            return {
                success: false,
                error: 'Configuration test failed',
                output: output
            };
        }
    } catch (error) {
        console.error('Error testing nginx configuration:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error occurred'
        };
    }
}
