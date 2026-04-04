import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { PageTitleBack } from '@/components/page-header';
import { getDatabaseById } from '@/services/databases/data';
import { getConnectionTableDataPage } from '@/services/database/explorer';
import type { DatabaseTableDataPage } from '@/app/database/types';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export const metadata: Metadata = {
  title: 'Table Data, Neup.Cloud',
};

type Props = {
  params: Promise<{ id: string; name: string }>;
  searchParams?: Promise<{ page?: string; perPage?: string }>;
};

function parsePage(value?: string) {
  const parsed = Number(value || '1');
  if (!Number.isInteger(parsed) || parsed < 1) {
    return 1;
  }

  return parsed;
}

function parsePerPage(value?: string): 10 | 25 | 50 {
  if (value === '25') {
    return 25;
  }

  if (value === '50') {
    return 50;
  }

  return 10;
}

function formatCellValue(value: unknown) {
  if (value === null || value === undefined) {
    return 'NULL';
  }

  if (typeof value === 'object') {
    return JSON.stringify(value);
  }

  return String(value);
}

export default async function DatabaseTableDataPage({ params, searchParams }: Props) {
  const { id, name } = await params;
  const resolvedSearchParams = searchParams ? await searchParams : undefined;

  const page = parsePage(resolvedSearchParams?.page);
  const perPage = parsePerPage(resolvedSearchParams?.perPage);

  const connection = await getDatabaseById(id);
  if (!connection) {
    notFound();
  }

  const tableName = decodeURIComponent(name);

  let data: DatabaseTableDataPage | null = null;
  let errorMessage = '';

  try {
    data = await getConnectionTableDataPage(connection, tableName, page, perPage);
  } catch (error) {
    errorMessage = error instanceof Error ? error.message : 'Unable to fetch table data.';
  }

  if (!data && !errorMessage) {
    notFound();
  }

  const totalRows = data?.totalRows;
  const currentPage = data?.page || page;
  const hasNextPage = data?.hasNextPage ?? false;

  const prevHref = `/database/${id}/table/${encodeURIComponent(tableName)}?page=${Math.max(1, currentPage - 1)}&perPage=${perPage}`;
  const nextHref = `/database/${id}/table/${encodeURIComponent(tableName)}?page=${currentPage + 1}&perPage=${perPage}`;

  return (
    <div className="grid gap-6 pb-20">
      <PageTitleBack
        backHref={`/database/${connection.id}/table`}
        title={tableName}
        description={`${connection.connectionType === 'firestore' ? 'Viewing documents from' : 'Viewing data from'} ${connection.title}`}
      />

      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">Rows per page:</span>
        {[10, 25, 50].map((option) => (
          <Button key={option} variant={option === perPage ? 'default' : 'outline'} size="sm" asChild>
            <Link href={`/database/${id}/table/${encodeURIComponent(tableName)}?page=1&perPage=${option}`}>{option}</Link>
          </Button>
        ))}
        <Badge variant="outline" className="ml-auto">Total rows: {typeof totalRows === 'number' ? totalRows : 'Unknown'}</Badge>
      </div>

      <Card className="overflow-hidden">
        {errorMessage ? (
          <div className="p-8 text-center text-muted-foreground">{errorMessage}</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                {(data?.columns || []).map((column) => (
                  <TableHead key={column} className="font-mono text-xs">{column}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {(data?.rows || []).length === 0 ? (
                <TableRow>
                  <TableCell colSpan={Math.max(1, data?.columns.length || 1)} className="text-center text-muted-foreground py-8">
                    No rows found.
                  </TableCell>
                </TableRow>
              ) : (
                (data?.rows || []).map((row, rowIndex) => (
                  <TableRow key={rowIndex}>
                    {(data?.columns || []).map((column: string) => (
                      <TableCell key={`${rowIndex}-${column}`} className="align-top">
                        <div className="max-w-[360px] break-words whitespace-pre-wrap text-xs font-mono">
                          {formatCellValue(row[column])}
                        </div>
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        )}
      </Card>

      <div className="flex items-center justify-between">
        <Button variant="outline" size="sm" disabled={currentPage <= 1} asChild={currentPage > 1}>
          {currentPage > 1 ? (
            <Link href={prevHref}>
              <ChevronLeft className="h-4 w-4 mr-1" /> Previous
            </Link>
          ) : (
            <span>
              <ChevronLeft className="h-4 w-4 mr-1 inline-block" /> Previous
            </span>
          )}
        </Button>

        <div className="text-sm text-muted-foreground">
          Page {currentPage}{typeof totalRows === 'number' ? ` of ${Math.max(1, Math.ceil(totalRows / perPage))}` : ''}
        </div>

        <Button variant="outline" size="sm" disabled={!hasNextPage} asChild={hasNextPage}>
          {hasNextPage ? (
            <Link href={nextHref}>
              Next <ChevronRight className="h-4 w-4 ml-1" />
            </Link>
          ) : (
            <span>
              Next <ChevronRight className="h-4 w-4 ml-1 inline-block" />
            </span>
          )}
        </Button>
      </div>
    </div>
  );
}
