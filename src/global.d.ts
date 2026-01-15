import type { IStaticMethods } from "flyonui/flyonui";

declare global {
    interface Window {
        HSStaticMethods: IStaticMethods;
        buildChart: (selector: string, options: () => ApexCharts.ApexOptions) => ApexCharts | false;
        buildTooltip: (props: any, options: Record<string, unknown>) => string;
    }
}

export { };
