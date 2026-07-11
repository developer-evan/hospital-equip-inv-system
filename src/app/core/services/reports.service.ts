import { Injectable, inject } from '@angular/core';
import { ApiService } from './api.service';
import { EquipmentStatus } from '../models/equipment-status.enum';

export type ReportFormat = 'excel' | 'pdf';

export interface ReportFilter {
  department?: string;
  status?: EquipmentStatus;
  engineer?: string;
  from?: string;
  to?: string;
  format?: ReportFormat;
}

export type ReportType =
  | 'inventory'
  | 'department-inventory'
  | 'condemned'
  | 'pm'
  | 'breakdown'
  | 'engineer-work';

@Injectable({ providedIn: 'root' })
export class ReportsService {
  private readonly api = inject(ApiService);

  download(report: ReportType, filter: ReportFilter): void {
    this.api.downloadFile(`/reports/${report}`, filter as Record<string, unknown>).subscribe({
      next: (blob) => this.triggerDownload(blob),
    });
  }

  private triggerDownload(blob: Blob): void {
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = '';
    anchor.click();
    window.URL.revokeObjectURL(url);
  }
}
