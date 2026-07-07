const toastMocks = vi.hoisted(() => ({
  success: vi.fn(),
  error: vi.fn(),
  info: vi.fn(),
  warning: vi.fn(),
}));

vi.mock("sonner", () => ({
  toast: toastMocks,
}));

import { notify } from "@/lib/notify";

describe("notify", () => {
  beforeEach(() => {
    toastMocks.success.mockReset();
    toastMocks.error.mockReset();
    toastMocks.info.mockReset();
    toastMocks.warning.mockReset();
  });

  it("delegates semantic messages to sonner", () => {
    notify.success("ok");
    notify.error("falhou");
    notify.info("info");
    notify.warning("atenção");

    expect(toastMocks.success).toHaveBeenCalledWith("ok");
    expect(toastMocks.error).toHaveBeenCalledWith("falhou");
    expect(toastMocks.info).toHaveBeenCalledWith("info");
    expect(toastMocks.warning).toHaveBeenCalledWith("atenção");
  });
});
