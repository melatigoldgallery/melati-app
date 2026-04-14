<template>
  <!-- Teleport ke body agar tidak terpengaruh stacking context -->
  <Teleport to="body">
    <div v-if="modelValue" class="modal fade show d-block" tabindex="-1" @click.self="onBackdropClick">
      <div
        class="modal-dialog"
        :class="[sizeClass, { 'modal-dialog-scrollable': scrollable }]"
        :style="maxWidth ? { maxWidth, width: maxWidth } : {}"
      >
        <div class="modal-content">
          <!-- Header -->
          <div class="modal-header" v-if="$slots.header || title">
            <slot name="header">
              <h5 class="modal-title">{{ title }}</h5>
            </slot>
            <button v-if="closable" type="button" class="btn-close" @click="$emit('update:modelValue', false)"></button>
          </div>

          <!-- Body -->
          <div class="modal-body">
            <slot />
          </div>

          <!-- Footer -->
          <div class="modal-footer" v-if="$slots.footer">
            <slot name="footer" />
          </div>
        </div>
      </div>
    </div>
    <!-- Backdrop -->
    <div v-if="modelValue" class="modal-backdrop fade show"></div>
  </Teleport>
</template>

<script setup>
import { computed } from "vue";

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  title: { type: String, default: "" },
  size: { type: String, default: "md" }, // sm | md | lg | xl
  maxWidth: { type: String, default: "" }, // e.g. "450px" — direct override
  closable: { type: Boolean, default: true },
  scrollable: { type: Boolean, default: false },
  staticBackdrop: { type: Boolean, default: false },
});

const emit = defineEmits(["update:modelValue"]);

const sizeClass = computed(
  () =>
    ({
      sm: "modal-sm",
      md: "",
      lg: "modal-lg",
      xl: "modal-xl",
    })[props.size] || "",
);

function onBackdropClick() {
  if (!props.staticBackdrop) emit("update:modelValue", false);
}
</script>
