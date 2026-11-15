<script setup lang="ts">
import {
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  Tooltip,
  type ChartData,
  type ChartOptions,
} from 'chart.js'
import { Line } from 'vue-chartjs'
import { formatShortDate } from '#shared/format'
import type { ExerciseKind } from '#shared/kinds'
import { formatProgress, PROGRESS_AXIS_LABEL, type ProgressPoint } from '#shared/progress'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend)

const props = defineProps<{ kind: ExerciseKind, points: ProgressPoint[] }>()

const hasDistance = computed(() => props.kind === 'cardio' && props.points.some(p => p.progress.distanceM != null))

function chartValue(p: ProgressPoint) {
  return props.kind === 'cardio' ? Number((p.progress.value / 60).toFixed(2)) : p.progress.value
}

const data = computed<ChartData<'line'>>(() => ({
  labels: props.points.map(p => formatShortDate(p.date)),
  datasets: [
    {
      label: PROGRESS_AXIS_LABEL[props.kind],
      data: props.points.map(chartValue),
      borderColor: '#22c55e',
      backgroundColor: '#22c55e',
      tension: 0.2,
      pointRadius: 4,
      yAxisID: 'y',
    },
    ...(hasDistance.value
      ? [{
          label: 'Longest distance (km)',
          data: props.points.map(p => (p.progress.distanceM == null ? null : p.progress.distanceM / 1000)),
          borderColor: '#3b82f6',
          backgroundColor: '#3b82f6',
          tension: 0.2,
          pointRadius: 4,
          yAxisID: 'y1',
          spanGaps: true,
        }]
      : []),
  ],
}))

const options = computed<ChartOptions<'line'>>(() => ({
  responsive: true,
  maintainAspectRatio: false,
  animation: false,
  plugins: {
    legend: { display: hasDistance.value, position: 'bottom' },
    tooltip: {
      callbacks: {
        label: ctx => formatProgress(props.kind, props.points[ctx.dataIndex]!.progress),
      },
    },
  },
  scales: {
    y: { beginAtZero: false, title: { display: true, text: PROGRESS_AXIS_LABEL[props.kind] } },
    ...(hasDistance.value ? { y1: { position: 'right' as const, grid: { drawOnChartArea: false }, title: { display: true, text: 'km' } } } : {}),
  },
}))
</script>

<template>
  <div class="relative h-64 w-full" data-testid="progress-chart" :data-points="points.length">
    <Line :data="data" :options="options" />
  </div>
</template>
