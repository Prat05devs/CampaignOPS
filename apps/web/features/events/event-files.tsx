"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Download, FileArchive, FileText, Image, Trash2, Upload } from "lucide-react";
import { ChangeEvent, useEffect, useMemo, useState } from "react";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { ApiError } from "../../lib/api-client";
import { refreshSession } from "../../lib/auth-api";
import {
  deleteFileAsset,
  downloadFileAsset,
  listFileAssets,
  uploadFileAsset,
  type FileAsset,
  type FileCategory
} from "../../lib/files-api";

type EventFilesProps = {
  accessToken: string;
  canManageOperations: boolean;
  eventId: string;
  onSessionExpired: () => void;
  onTokensRefreshed: (tokens: { accessToken: string; refreshToken: string }) => void;
  refreshToken: string;
};

const fileCategories: FileCategory[] = [
  "PROPOSAL",
  "BUDGET",
  "POSTER",
  "CREATIVE",
  "AGREEMENT",
  "PERMISSION",
  "QUOTATION",
  "REPORT",
  "PHOTO",
  "VIDEO",
  "PR_DOCUMENT",
  "TEMPLATE"
];

const categoryLabels: Record<FileCategory, string> = {
  AGREEMENT: "Agreement",
  BUDGET: "Budget",
  CREATIVE: "Creative",
  PERMISSION: "Permission",
  PHOTO: "Photo",
  POSTER: "Poster",
  PROPOSAL: "Proposal",
  PR_DOCUMENT: "PR Document",
  QUOTATION: "Quotation",
  REPORT: "Report",
  TEMPLATE: "Template",
  VIDEO: "Video"
};

const fieldClass =
  "h-10 rounded-md border border-campaign-mist bg-white px-3 text-sm outline-none transition focus:border-campaign-orange focus:ring-2 focus:ring-campaign-orange/15";

export function EventFiles({
  accessToken,
  canManageOperations,
  eventId,
  onSessionExpired,
  onTokensRefreshed,
  refreshToken
}: EventFilesProps) {
  const queryClient = useQueryClient();
  const [category, setCategory] = useState<FileCategory>("PROPOSAL");
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const filesQuery = useQuery({
    queryFn: () => listFileAssets(eventId, accessToken),
    queryKey: ["events", eventId, "files", accessToken]
  });

  useEffect(() => {
    async function refreshExpiredAccessToken() {
      if (!(filesQuery.error instanceof ApiError) || filesQuery.error.status !== 401) {
        return;
      }

      try {
        const refreshedSession = await refreshSession(refreshToken);
        onTokensRefreshed(refreshedSession.tokens);
      } catch {
        onSessionExpired();
      }
    }

    void refreshExpiredAccessToken();
  }, [filesQuery.error, onSessionExpired, onTokensRefreshed, refreshToken]);

  const uploadMutation = useMutation({
    mutationFn: async () => {
      if (!selectedFile) {
        throw new Error("Choose a file before uploading.");
      }

      try {
        return await uploadFileAsset(eventId, { category, file: selectedFile }, accessToken);
      } catch (error) {
        if (!(error instanceof ApiError) || error.status !== 401) {
          throw error;
        }

        const refreshedSession = await refreshSession(refreshToken);
        onTokensRefreshed(refreshedSession.tokens);
        return uploadFileAsset(eventId, { category, file: selectedFile }, refreshedSession.tokens.accessToken);
      }
    },
    onSuccess: async () => {
      setCategory("PROPOSAL");
      setSelectedFile(null);
      await queryClient.invalidateQueries({ queryKey: ["events", eventId, "files"] });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (fileId: string) => {
      try {
        return await deleteFileAsset(eventId, fileId, accessToken);
      } catch (error) {
        if (!(error instanceof ApiError) || error.status !== 401) {
          throw error;
        }

        const refreshedSession = await refreshSession(refreshToken);
        onTokensRefreshed(refreshedSession.tokens);
        return deleteFileAsset(eventId, fileId, refreshedSession.tokens.accessToken);
      }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["events", eventId, "files"] });
    }
  });

  const downloadMutation = useMutation({
    mutationFn: async (file: FileAsset) => {
      setDownloadError(null);

      try {
        const blob = await downloadFileAsset(eventId, file.id, accessToken);
        saveBlob(blob, file.fileName);
      } catch (error) {
        if (!(error instanceof ApiError) || error.status !== 401) {
          throw error;
        }

        const refreshedSession = await refreshSession(refreshToken);
        onTokensRefreshed(refreshedSession.tokens);
        const blob = await downloadFileAsset(eventId, file.id, refreshedSession.tokens.accessToken);
        saveBlob(blob, file.fileName);
      }
    },
    onError: (error) => {
      setDownloadError(error instanceof Error ? error.message : "Download failed.");
    }
  });

  const files = filesQuery.data ?? [];
  const summary = useMemo(
    () => ({
      categories: new Set(files.map((file) => file.category)).size,
      photos: files.filter((file) => file.category === "PHOTO" || file.category === "VIDEO").length,
      total: files.length
    }),
    [files]
  );

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    setSelectedFile(event.target.files?.[0] ?? null);
  }

  function handleUpload() {
    if (!selectedFile) {
      return;
    }

    uploadMutation.mutate();
  }

  return (
    <section className="space-y-5">
      <div className="grid gap-4 md:grid-cols-3">
        <FileMetric icon={FileText} label="Files" value={String(summary.total)} />
        <FileMetric icon={FileArchive} label="Categories" value={String(summary.categories)} />
        <FileMetric icon={Image} label="Photos / Videos" value={String(summary.photos)} />
      </div>

      {canManageOperations ? (
        <div className="rounded-md border border-campaign-mist bg-white p-4 shadow-sm">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold">Upload File</h2>
              <p className="text-xs text-muted-foreground">{filesQuery.isFetching ? "Syncing" : "Live"}</p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-campaign-orange/10 text-campaign-orange">
              <Upload className="h-5 w-5" />
            </div>
          </div>

          <div className="grid gap-3 xl:grid-cols-[220px_1fr]">
            <label className="grid gap-1">
              <span className="text-xs font-medium text-campaign-ink/70">Category</span>
              <select className={fieldClass} onChange={(event) => setCategory(event.target.value as FileCategory)} value={category}>
                {fileCategories.map((item) => (
                  <option key={item} value={item}>
                    {categoryLabels[item]}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-1">
              <span className="text-xs font-medium text-campaign-ink/70">File</span>
              <input
                className="h-10 rounded-md border border-campaign-mist bg-white px-3 py-2 text-sm outline-none transition file:mr-3 file:rounded-md file:border-0 file:bg-campaign-mist file:px-3 file:py-1 file:text-xs file:font-medium focus:border-campaign-orange focus:ring-2 focus:ring-campaign-orange/15"
                onChange={handleFileChange}
                type="file"
              />
            </label>
          </div>

          {uploadMutation.isError ? (
            <p className="mt-3 rounded-md border border-campaign-orange/30 bg-campaign-orange/10 px-3 py-2 text-xs text-campaign-orange">
              {uploadMutation.error.message}
            </p>
          ) : null}

          <div className="mt-4 flex justify-end">
            <Button disabled={!selectedFile || uploadMutation.isPending} onClick={handleUpload} type="button">
              {uploadMutation.isPending ? "Uploading..." : "Upload File"}
            </Button>
          </div>
        </div>
      ) : (
        <ReadOnlyNotice />
      )}

      {downloadError ? (
        <div className="rounded-md border border-campaign-orange/30 bg-campaign-orange/10 px-3 py-2 text-sm text-campaign-orange">
          {downloadError}
        </div>
      ) : null}

      {filesQuery.isError ? (
        <div className="rounded-md border border-campaign-orange/30 bg-campaign-orange/10 px-3 py-2 text-sm text-campaign-orange">
          {filesQuery.error.message}
        </div>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Event Files</CardTitle>
        </CardHeader>
        <CardContent>
          {files.length ? (
            <div className="space-y-3">
              {files.map((file) => (
                <FileRow
                  canManageOperations={canManageOperations}
                  file={file}
                  isDeleting={deleteMutation.isPending}
                  isDownloading={downloadMutation.isPending}
                  key={file.id}
                  onDelete={() => deleteMutation.mutate(file.id)}
                  onDownload={() => downloadMutation.mutate(file)}
                />
              ))}
            </div>
          ) : (
            <div className="rounded-md border border-dashed border-campaign-mist bg-white px-4 py-8 text-center text-sm text-muted-foreground">
              No files uploaded for this event yet.
            </div>
          )}
        </CardContent>
      </Card>
    </section>
  );
}

function FileMetric({
  icon: Icon,
  label,
  value
}: {
  icon: typeof FileText;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-md border border-campaign-mist bg-white p-4 shadow-sm">
      <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-md bg-campaign-orange/10 text-campaign-orange">
        <Icon className="h-4 w-4" />
      </div>
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="mt-1 text-lg font-semibold">{value}</p>
    </div>
  );
}

function FileRow({
  canManageOperations,
  file,
  isDeleting,
  isDownloading,
  onDelete,
  onDownload
}: {
  canManageOperations: boolean;
  file: FileAsset;
  isDeleting: boolean;
  isDownloading: boolean;
  onDelete: () => void;
  onDownload: () => void;
}) {
  return (
    <article className="grid gap-3 rounded-md border border-campaign-mist bg-white p-3 md:grid-cols-[1fr_140px_150px_150px] md:items-center">
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold">{file.fileName}</p>
        <p className="mt-1 text-xs text-muted-foreground">
          {categoryLabels[file.category]} · {file.uploadedBy.name}
        </p>
      </div>
      <div>
        <p className="text-[11px] uppercase text-muted-foreground">Size</p>
        <p className="mt-1 text-sm font-medium">{formatBytes(file.sizeBytes ?? 0)}</p>
      </div>
      <div>
        <p className="text-[11px] uppercase text-muted-foreground">Uploaded</p>
        <p className="mt-1 text-sm font-medium">{formatDate(file.createdAt)}</p>
      </div>
      <div className="flex justify-end gap-2">
        <Button disabled={isDownloading} onClick={onDownload} size="icon" type="button" variant="outline">
          <Download className="h-4 w-4" />
        </Button>
        {canManageOperations ? (
          <Button disabled={isDeleting} onClick={onDelete} size="icon" type="button" variant="outline">
            <Trash2 className="h-4 w-4" />
          </Button>
        ) : null}
      </div>
    </article>
  );
}

function ReadOnlyNotice() {
  return (
    <div className="rounded-md border border-campaign-mist bg-white px-4 py-3 text-sm text-muted-foreground shadow-sm">
      Your role has read-only access for this workspace area.
    </div>
  );
}

function saveBlob(blob: Blob, fileName: string) {
  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.URL.revokeObjectURL(url);
}

function formatBytes(value: number) {
  if (!value) {
    return "-";
  }

  const units = ["B", "KB", "MB", "GB"];
  const index = Math.min(Math.floor(Math.log(value) / Math.log(1024)), units.length - 1);
  const amount = value / 1024 ** index;

  return `${amount.toFixed(amount >= 10 || index === 0 ? 0 : 1)} ${units[index]}`;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium"
  }).format(new Date(value));
}
