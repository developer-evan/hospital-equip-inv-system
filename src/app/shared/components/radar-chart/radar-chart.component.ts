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
import { Chart, ChartConfiguration } from 'chart.js';
import { ensureChartRegistered } from '../../chart/chart-register';

export interface RadarSeries {
  label: string;
  data: number[];
  color: string;
}

@Component({
  selector: 'app-radar-chart',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<canvas #canvas></canvas>`,
  styles: `:host { position: relative; display: block; height: 100%; width: 100%; }`,
})
export class RadarChartComponent implements AfterViewInit, OnDestroy {
  readonly labels = input.required<string[]>();
  readonly series = input.required<RadarSeries[]>();

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

  private buildConfig(): ChartConfiguration<'radar'> {
    return {
      type: 'radar',
      data: { labels: this.labels(), datasets: this.buildDatasets() },
      options: {
        responsive: true,
        maintainAspectRatio: false,
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
          r: {
            angleLines: { color: 'rgba(255,255,255,0.06)' },
            grid: { color: 'rgba(255,255,255,0.06)' },
            pointLabels: { font: { size: 11 }, color: '#475569' },
            ticks: { display: false, backdropColor: 'transparent' },
            suggestedMin: 0,
            suggestedMax: 100,
          },
        },
      },
    };
  }

  private buildDatasets(): ChartConfiguration<'radar'>['data']['datasets'] {
    return this.series().map((s) => ({
      label: s.label,
      data: s.data,
      borderColor: s.color,
      backgroundColor: `${s.color}22`,
      pointBackgroundColor: s.color,
      pointBorderColor: '#0a0b0f',
      pointBorderWidth: 1,
      pointRadius: 3,
      borderWidth: 2,
    }));
  }
}
