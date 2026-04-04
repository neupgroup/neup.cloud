'use client';

import { useState } from 'react';
import { Terminal, Play, Trash2, AlertCircle, CheckCircle2, Clock } from 'lucide-react';
import { PageTitleBack } from '@/components/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { executeDatabaseShellQuery } from '@/app/database/actions';
import type { DatabaseConnectionType, DatabaseShellQueryResult } from '@/app/database/types';

const QUICK_QUERIES: Record<DatabaseConnectionType, Array<{ label: string; query: string }>> = {
  postgres: [
    { label: 'List tables', query: "SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY table_name;" },
    { label: 'Current user', query: 'SELECT current_user;' },
    { label: 'Current DB', query: 'SELECT current_database();' },
  ],
  mysql: [
    { label: 'List tables', query: 'SHOW TABLES;' },
    { label: 'Current user', query: 'SELECT CURRENT_USER();' },
    { label: 'Current DB', query: 'SELECT DATABASE();' },
  ],
  mariadb: [
    { label: 'List tables', query: 'SHOW TABLES;' },
    { label: 'Current user', query: 'SELECT CURRENT_USER();' },
    { label: 'Current DB', query: 'SELECT DATABASE();' },
  ],
  sqlite: [],
  firestore: [],
};

function formatCell(value: unknown) {
  if (value === null || value === undefined) {
    return 'NULL';
  }

  if (typeof value === 'object') {
    return JSON.stringify(value);
  }

  return String(value);
}

type Props = {
  connectionId: string;
  title: string;
  connectionType: DatabaseConnectionType;
};

export default function ShellClient({ connectionId, title, connectionType }: Props) {
  const { toast } = useToast();
  const [query, setQuery] = useState('SELECT 1;');
  const [isExecuting, setIsExecuting] = useState(false);
  const [result, setResult] = useState<DatabaseShellQueryResult | null>(null);
  const [error, setError] = useState('');

  const runQuery = async () => {
    if (!query.trim()) {
      toast({
        variant: 'destructive',
        title: 'Empty query',
        description: 'Please enter a SQL query to execute.',
      });
      return;
    }

    setIsExecuting(true);
    setError('');

    try {
      const response = await executeDatabaseShellQuery(connectionId, query);
      setResult(response);

      toast({
        title: 'Query executed',
        description: response.message || `Returned ${response.rowCount} rows.`,
      });
    } catch (err: any) {
      const message = err?.message || 'Unable to execute query.';
      setError(message);
      setResult(null);

      toast({
        variant: 'destructive',
        title: 'Execution failed',
        description: message,
      });
    } finally {
      setIsExecuting(false);
    }
  };

  return (
    <div className="grid gap-8 pb-20">
      <PageTitleBack
        backHref={`/database/${connectionId}`}
        title={
          <span className="flex items-center gap-2">
            <Terminal className="h-7 w-7 text-primary" />
            SQL Shell
          </span>
        }
        description={`Run SQL commands on ${title}`}
      />

      <Card className="border-amber-500/20 bg-amber-500/5">
        <CardContent className="pt-6 text-sm text-amber-900/70 dark:text-amber-500/70">
          Commands execute directly on your external database connection. Use caution with UPDATE/DELETE/DROP statements.
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-2">
            <div>
              <CardTitle>Query Editor</CardTitle>
              <CardDescription>Connection type: <span className="uppercase">{connectionType}</span></CardDescription>
            </div>
            <Badge variant="outline" className="uppercase">{connectionType}</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="min-h-[200px] font-mono text-sm"
            placeholder="SELECT * FROM your_table LIMIT 10;"
            disabled={isExecuting}
          />

          <div className="flex flex-wrap gap-2">
            {QUICK_QUERIES[connectionType].map((item) => (
              <Button key={item.label} variant="outline" size="sm" onClick={() => setQuery(item.query)} disabled={isExecuting}>
                {item.label}
              </Button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <Button onClick={runQuery} disabled={isExecuting || !query.trim()}>
              {isExecuting ? <Clock className="h-4 w-4 mr-2 animate-spin" /> : <Play className="h-4 w-4 mr-2" />}
              {isExecuting ? 'Executing...' : 'Run Query'}
            </Button>
            <Button variant="outline" onClick={() => { setQuery(''); setResult(null); setError(''); }} disabled={isExecuting}>
              <Trash2 className="h-4 w-4 mr-2" />
              Clear
            </Button>
          </div>
        </CardContent>
      </Card>

      {error && (
        <Card className="border-red-500/20">
          <CardContent className="pt-6 text-sm text-red-600 flex items-start gap-2">
            <AlertCircle className="h-4 w-4 mt-0.5" />
            <span>{error}</span>
          </CardContent>
        </Card>
      )}

      {result && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              Result
            </CardTitle>
            <CardDescription>
              {result.message || `${result.rowCount} rows`} in {result.executionTimeMs}ms
            </CardDescription>
          </CardHeader>
          <CardContent>
            {result.rows.length === 0 ? (
              <p className="text-sm text-muted-foreground">No rows returned.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    {result.columns.map((column) => (
                      <TableHead key={column} className="font-mono text-xs">{column}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {result.rows.map((row, index) => (
                    <TableRow key={index}>
                      {result.columns.map((column) => (
                        <TableCell key={`${index}-${column}`}>
                          <div className="max-w-[360px] break-words whitespace-pre-wrap text-xs font-mono">
                            {formatCell(row[column])}
                          </div>
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
