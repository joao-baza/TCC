const toastMocks = vi.hoisted(() => ({
  custom: vi.fn(),
}));

vi.mock("sonner", () => ({
  toast: toastMocks,
}));

import { notify } from "@/lib/notify";

describe("notify", () => {
  beforeEach(() => {
    toastMocks.custom.mockReset();
  });

  it("delegates semantic messages to custom toast callouts", () => {
    notify.success("ok");
    notify.error("falhou");
    notify.info("info");
    notify.warning("atenção");

    expect(toastMocks.custom).toHaveBeenCalledTimes(4);

    const renderedToasts = toastMocks.custom.mock.calls.map(([renderToast]) =>
      (renderToast as (id: number) => { props: { variant: string; message: string } })(1),
    );

    expect(renderedToasts.map((toast) => toast.props.variant)).toEqual([
      "success",
      "error",
      "info",
      "warning",
    ]);
    expect(renderedToasts.map((toast) => toast.props.message)).toEqual([
      "ok",
      "falhou",
      "info",
      "atenção",
    ]);
  });
});
