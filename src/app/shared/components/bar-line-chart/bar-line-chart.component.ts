import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  effect,
  input,
  viewChild,
} from '@angular/core';
import { Chart, ChartConfiguration, ChartDataset } from 'chart.js';
import { ensureChartRegistered } from '../../chart/chart-register';

export interface BarSeries {
  label: string;
  data: number[];
  color: string;
  colorDim?: string;
}

export interface LineSeries {
  label: string;
  data: number[];
  color: string;
}

@Component({
  selector: 'app-bar-line-chart',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<canvas #canvas></canvas>`,
  styles: `:host { position: relative; display: block; height: 100%; width: 100%; }`,
})
export class BarLineChartComponent implements AfterViewInit, OnDestroy {
  readonly labels = input.required<string[]>();
  readonly bars = input.required<BarSeries[]>();
  readonly line = input<LineSeries | null>(null);

  private readonly canvasRef = viewChild.required<ElementRef<HTMLCanvasElement>>('canvas');
  private chart?: Chart;

  constructor() {
    ensureChartRegistered();
    effect(() => {
      const labels = this.labels();
      const datasets = this.buildDatasets();
      if (this.chart) {
        this.chart.data.labels = labels;
        this.chart.data.datasets = datasets;
        this.chart.update('none');
      }
    });
  }

  ngAfterViewInit(): void {
    this.chart = new Chart(this.canvasRef().nativeElement, this.buildConfig());
  }

  ngOnDestroy(): void {
    this.chart?.destroy();
  }

  private buildConfig(): ChartConfiguration {
    return {
      type: 'bar',
      data: { labels: this.labels(), datasets: this.buildDatasets() },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: { display: false },
          tooltip: {
            padding: 10,
            cornerRadius: 8,
            backgroundColor: '#1a1d26',
            borderColor: 'rgba(255,255,255,0.08)',
            borderWidth: 1,
            titleColor: '#e2e8f0',
            bodyColor: '#94a3b8',
          },
        },
        scales: {
          x: {
            stacked: true,
            grid: { display: false },
            border: { display: false },
            ticks: { color: '#4b5470', font: { size: 11 } },
          },
          y: {
            stacked: true,
            grid: { color: 'rgba(255,255,255,0.04)' },
            border: { display: false },
            ticks: { color: '#4b5470', font: { size: 11 } },
          },
        },
      },
    };
  }

  private buildDatasets(): ChartDataset[] {
    const datasets: ChartDataset[] = this.bars().map((series) => ({
      type: 'bar' as const,
      label: series.label,
      data: series.data,
      backgroundColor: series.color,
      borderRadius: { topLeft: 4, topRight: 4, bottomLeft: 0, bottomRight: 0 },
      borderSkipped: false,
      stack: 'stack0',
      maxBarThickness: 20,
    }));

    const line = this.line();
    if (line) {
      datasets.push({
        type: 'line' as const,
        label: line.label,
        data: line.data,
        borderColor: line.color,
        backgroundColor: line.color,
        tension: 0.4,
        borderWidth: 2,
        pointRadius: 3,
        pointBackgroundColor: '#0a0b0f',
        pointBorderColor: line.color,
        pointBorderWidth: 2,
        pointHoverRadius: 5,
      });
    }

    return datasets;
  }
}
